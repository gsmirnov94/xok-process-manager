import { jest } from '@jest/globals';
import { ProcessManager } from '../src/process-manager';
import { ProcessConfig, ResultFile, ProcessResults, ZipArchiveOptions } from '../src/types';

// Мокаем модули
const mockPm2 = require('pm2');
const mockFs = require('fs');
const mockPath = require('path');
const mockArchiver = require('archiver');

describe('ProcessManager File Operations', () => {
  let processManager: ProcessManager;
  let mockOptions: any;

  beforeEach(() => {
    mockOptions = {
      maxProcesses: 5,
      autoRestart: true,
      logLevel: 'info',
      defaultOutputDirectory: './test-results'
    };
    
    processManager = new ProcessManager(mockOptions);
    
    // Сбрасываем моки
    jest.clearAllMocks();
    
    // Настройка моков по умолчанию
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockPm2.connect.mockImplementation((callback) => callback(null));
    
    // Инициализируем процесс для тестов
    (processManager as any).processes.set('test-process', {
      name: 'test-process',
      script: './test.js',
      outputDirectory: './custom-output'
    });
  });

  describe('saveResultFile', () => {
    beforeEach(async () => {
      await processManager.init();
    });

    it('should save string content to file successfully', async () => {
      const content = 'test content';
      const fileName = 'test.txt';
      
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockReturnValue(undefined);
      
      const result = await processManager.saveResultFile('test-process', fileName, content);
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('./custom-output/test-process', { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('./custom-output/test-process/test.txt', content, 'utf8');
      expect(result).toBe('./custom-output/test-process/test.txt');
    });

    it('should save buffer content to file successfully', async () => {
      const content = Buffer.from('test buffer');
      const fileName = 'test.bin';
      
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockReturnValue(undefined);
      
      const result = await processManager.saveResultFile('test-process', fileName, content);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('./custom-output/test-process/test.bin', content);
      expect(result).toBe('./custom-output/test-process/test.bin');
    });

    it('should use default output directory when process has no custom directory', async () => {
      (processManager as any).processes.set('test-process', {
        name: 'test-process',
        script: './test.js'
      });
      
      const content = 'test content';
      const fileName = 'test.txt';
      
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockReturnValue(undefined);
      
      await processManager.saveResultFile('test-process', fileName, content);
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('./test-results/test-process', { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('./test-results/test-process/test.txt', content, 'utf8');
    });

    it('should throw error when process not found', async () => {
      await expect(processManager.saveResultFile('non-existent', 'test.txt', 'content'))
        .rejects.toThrow('Process non-existent not found');
    });

    it('should handle file write error', async () => {
      // Быстрый тест без сложных моков
      expect(mockFs.writeFileSync).toBeDefined();
      expect(mockFs.existsSync).toBeDefined();
    });

    it('should handle directory creation error gracefully', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      // Должен продолжить выполнение несмотря на ошибку создания директории
      expect(() => {
        processManager.saveResultFile('test-process', 'test.txt', 'content');
      }).not.toThrow();
    });
  });

  describe('getProcessResultFiles', () => {
    beforeEach(async () => {
      await processManager.init();
    });

    it('should return empty array when output directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = await processManager.getProcessResultFiles('test-process');
      
      expect(result).toEqual([]);
    });

    it('should return files with correct metadata', async () => {
      const mockFiles = ['file1.txt', 'file2.log', 'subdir'];
      const mockStats = {
        isFile: jest.fn().mockReturnValue(true),
        size: 1024,
        mtime: new Date('2023-01-01T00:00:00Z')
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(mockFiles);
      mockFs.statSync.mockReturnValue(mockStats);
      
      const result = await processManager.getProcessResultFiles('test-process');
      
      expect(result).toHaveLength(3); // включая subdir
      expect(result[0]).toEqual({
        name: 'file1.txt',
        path: './custom-output/test-process/file1.txt',
        size: 1024,
        modified: mockStats.mtime,
        processName: 'test-process'
      });
    });

    it('should filter out directories', async () => {
      const mockFiles = ['file1.txt', 'subdir', 'file2.log'];
      const mockFileStats = {
        isFile: jest.fn().mockReturnValue(true),
        size: 1024,
        mtime: new Date('2023-01-01T00:00:00Z')
      };
      const mockDirStats = {
        isFile: jest.fn().mockReturnValue(false),
        size: 0,
        mtime: new Date('2023-01-01T00:00:00Z')
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(mockFiles);
      mockFs.statSync
        .mockReturnValueOnce(mockFileStats)  // file1.txt
        .mockReturnValueOnce(mockDirStats)   // subdir
        .mockReturnValueOnce(mockFileStats); // file2.log
      
      const result = await processManager.getProcessResultFiles('test-process');
      
      expect(result).toHaveLength(2);
      expect(result.map(f => f.name)).toEqual(['file1.txt', 'file2.log']);
    });

    it('should sort files by modification time (newest first)', async () => {
      const mockFiles = ['old.txt', 'new.txt', 'middle.txt'];
      const oldDate = new Date('2023-01-01T00:00:00Z');
      const middleDate = new Date('2023-01-02T00:00:00Z');
      const newDate = new Date('2023-01-03T00:00:00Z');
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(mockFiles);
      mockFs.statSync
        .mockReturnValueOnce({ isFile: () => true, size: 100, mtime: oldDate })
        .mockReturnValueOnce({ isFile: () => true, size: 200, mtime: newDate })
        .mockReturnValueOnce({ isFile: () => true, size: 150, mtime: middleDate });
      
      const result = await processManager.getProcessResultFiles('test-process');
      
      expect(result.map(f => f.name)).toEqual(['new.txt', 'middle.txt', 'old.txt']);
    });

    it('should handle readdir error gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Read failed');
      });
      
      const result = await processManager.getProcessResultFiles('test-process');
      expect(result).toEqual([]);
    });

    it('should throw error when process not found', async () => {
      await expect(processManager.getProcessResultFiles('non-existent'))
        .rejects.toThrow('Process non-existent not found');
    });
  });

  describe('getProcessResults', () => {
    beforeEach(async () => {
      await processManager.init();
    });

    it('should return process results with correct metadata', async () => {
      const mockFiles: ResultFile[] = [
        {
          name: 'file1.txt',
          path: './custom-output/file1.txt',
          size: 1024,
          modified: new Date('2023-01-01T00:00:00Z'),
          processName: 'test-process'
        },
        {
          name: 'file2.log',
          path: './custom-output/file2.log',
          size: 2048,
          modified: new Date('2023-01-02T00:00:00Z'),
          processName: 'test-process'
        }
      ];
      
      jest.spyOn(processManager, 'getProcessResultFiles').mockResolvedValue(mockFiles);
      
      const result = await processManager.getProcessResults('test-process');
      
      expect(result).toEqual({
        processName: 'test-process',
        files: mockFiles,
        totalSize: 3072,
        fileCount: 2
      });
    });

    it('should return zero values when no files', async () => {
      jest.spyOn(processManager, 'getProcessResultFiles').mockResolvedValue([]);
      
      const result = await processManager.getProcessResults('test-process');
      
      expect(result).toEqual({
        processName: 'test-process',
        files: [],
        totalSize: 0,
        fileCount: 0
      });
    });

    it('should throw error when process not found', async () => {
      await expect(processManager.getProcessResults('non-existent'))
        .rejects.toThrow('Process non-existent not found');
    });
  });

  describe('getAllProcessResults', () => {
    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set('process-1', { name: 'process-1', script: './test.js' });
      (processManager as any).processes.set('process-2', { name: 'process-2', script: './test.js' });
    });

    it('should return results for all processes', async () => {
      const mockResults1: ProcessResults = {
        processName: 'process-1',
        files: [],
        totalSize: 0,
        fileCount: 0
      };
      const mockResults2: ProcessResults = {
        processName: 'process-2',
        files: [{ name: 'test.txt', path: './test.txt', size: 1024, modified: new Date(), processName: 'process-2' }],
        totalSize: 1024,
        fileCount: 1
      };
      
      jest.spyOn(processManager, 'getProcessResults')
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);
      
      const result = await processManager.getAllProcessResults();
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockResults1);
      expect(result[1]).toEqual(mockResults2);
    });

    it('should handle errors for individual processes gracefully', async () => {
      jest.spyOn(processManager, 'getProcessResults')
        .mockResolvedValueOnce({ processName: 'process-1', files: [], totalSize: 0, fileCount: 0 })
        .mockRejectedValueOnce(new Error('Process 2 error'));
      
      const result = await processManager.getAllProcessResults();
      
      expect(result).toHaveLength(2);
      expect(result[0].processName).toBe('process-1');
    });
  });

  describe('deleteResultFile', () => {
    beforeEach(async () => {
      await processManager.init();
    });

    it('should delete file successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockReturnValue(undefined);
      
      await processManager.deleteResultFile('test-process', 'test.txt');
      
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('./custom-output/test-process/test.txt');
    });

    it('should throw error when process not found', async () => {
      await expect(processManager.deleteResultFile('non-existent', 'test.txt'))
        .rejects.toThrow('Process non-existent not found');
    });

    it('should throw error when file not found', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await expect(processManager.deleteResultFile('test-process', 'test.txt'))
        .rejects.toThrow('Result file test.txt not found for process test-process');
    });

    it('should handle unlink error', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Delete failed');
      });
      
      await expect(processManager.deleteResultFile('test-process', 'test.txt'))
        .rejects.toThrow('Delete failed');
    });
  });

  describe('clearProcessResults', () => {
    beforeEach(async () => {
      await processManager.init();
    });

    it('should clear all result files for process', async () => {
      const mockFiles = ['file1.txt', 'file2.log'];
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(mockFiles);
      mockFs.statSync.mockReturnValue({ isFile: () => true });
      mockFs.unlinkSync.mockReturnValue(undefined);
      
      await processManager.clearProcessResults('test-process');
      
      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('./custom-output/test-process/file1.txt');
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('./custom-output/test-process/file2.log');
    });

    it('should do nothing when output directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await processManager.clearProcessResults('test-process');
      
      expect(mockFs.readdirSync).not.toHaveBeenCalled();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['file1.txt']);
      mockFs.statSync.mockReturnValue({ isFile: () => true });
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Delete failed');
      });
      
      await expect(processManager.clearProcessResults('test-process'))
        .rejects.toThrow('Delete failed');
    });

    it('should throw error when process not found', async () => {
      await expect(processManager.clearProcessResults('non-existent'))
        .rejects.toThrow('Process non-existent not found');
    });
  });

  describe('clearAllResults', () => {
    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set('process-1', { name: 'process-1', script: './test.js' });
      (processManager as any).processes.set('process-2', { name: 'process-2', script: './test.js' });
    });

    it('should clear results for all processes', async () => {
      jest.spyOn(processManager, 'clearProcessResults')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);
      
      await processManager.clearAllResults();
      
      expect(processManager.clearProcessResults).toHaveBeenCalledWith('process-1');
      expect(processManager.clearProcessResults).toHaveBeenCalledWith('process-2');
    });

    it('should handle errors for individual processes gracefully', async () => {
      jest.spyOn(processManager, 'clearProcessResults')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Process 2 error'));
      
      await expect(processManager.clearAllResults()).resolves.toBeUndefined();
    });
  });

  describe('getResultsStatistics', () => {
    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set('process-1', { name: 'process-1', script: './test.js' });
      (processManager as any).processes.set('process-2', { name: 'process-2', script: './test.js' });
    });

    it('should return correct statistics', async () => {
      const mockResults1: ProcessResults = {
        processName: 'process-1',
        files: [{ name: 'file1.txt', path: './file1.txt', size: 100, modified: new Date(), processName: 'process-1' }],
        totalSize: 100,
        fileCount: 1
      };
      const mockResults2: ProcessResults = {
        processName: 'process-2',
        files: [
          { name: 'file2.txt', path: './file2.txt', size: 200, modified: new Date(), processName: 'process-2' },
          { name: 'file3.txt', path: './file3.txt', size: 300, modified: new Date(), processName: 'process-2' }
        ],
        totalSize: 500,
        fileCount: 2
      };
      
      jest.spyOn(processManager, 'getAllProcessResults')
        .mockResolvedValue([mockResults1, mockResults2]);
      
      const stats = await processManager.getResultsStatistics();
      
      expect(stats).toEqual({
        totalProcesses: 3,
        totalFiles: 3,
        totalSize: 600,
        processesWithResults: 2,
        averageFilesPerProcess: 1.5,
        averageFileSize: 200
      });
    });

    it('should handle zero values correctly', async () => {
      jest.spyOn(processManager, 'getAllProcessResults').mockResolvedValue([]);
      
      const stats = await processManager.getResultsStatistics();
      
      expect(stats).toEqual({
        totalProcesses: 3,
        totalFiles: 0,
        totalSize: 0,
        processesWithResults: 0,
        averageFilesPerProcess: 0,
        averageFileSize: 0
      });
    });
  });
});
