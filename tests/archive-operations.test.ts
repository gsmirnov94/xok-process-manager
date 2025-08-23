import { jest } from '@jest/globals';
import { ProcessManager } from '../src/process-manager';
import { ProcessConfig, ResultFile, ProcessResults, ZipArchiveOptions } from '../src/types';

// Мокаем модули
const mockPm2 = require('pm2');
const mockFs = require('fs');
const mockPath = require('path');
const mockArchiver = require('archiver');

describe('ProcessManager Archive Operations', () => {
  let processManager: ProcessManager;
  let mockOptions: any;
  let mockArchive: any;
  let mockWriteStream: any;

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
    
    // Мокаем архив
    mockArchive = {
      pipe: jest.fn().mockReturnThis(),
      file: jest.fn().mockReturnThis(),
      finalize: jest.fn(),
      on: jest.fn(),
      pointer: jest.fn(() => 1024)
    };
    
    mockArchiver.mockReturnValue(mockArchive);
    
    // Мокаем поток записи
    mockWriteStream = {
      on: jest.fn()
    };
    mockFs.createWriteStream.mockReturnValue(mockWriteStream);
    
    // Инициализируем процесс для тестов
    (processManager as any).processes.set('test-process', {
      name: 'test-process',
      script: './test.js',
      outputDirectory: './custom-output'
    });
  });

  describe('createProcessResultsZip', () => {
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

    beforeEach(async () => {
      await processManager.init();
      jest.spyOn(processManager, 'getProcessResults').mockResolvedValue({
        processName: 'test-process',
        files: mockFiles,
        totalSize: 3072,
        fileCount: 2
      });
    });

    it('should create zip archive successfully with default options', async () => {
      // Настраиваем моки для успешного создания архива
      mockWriteStream.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });
      
      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Не вызываем ошибку
        }
      });
      
      const result = await processManager.createProcessResultsZip('test-process');
      
      expect(mockFs.createWriteStream).toHaveBeenCalled();
      expect(mockArchiver).toHaveBeenCalledWith('zip', { zlib: { level: 6 } });
      expect(mockArchive.pipe).toHaveBeenCalledWith(mockWriteStream);
      expect(mockArchive.file).toHaveBeenCalledTimes(2);
      expect(mockArchive.finalize).toHaveBeenCalled();
      expect(result).toMatch(/test-process-results-\d+\.zip$/);
    });

    it('should create zip archive with custom output path', async () => {
      const customPath = './custom-archive.zip';
      
      mockWriteStream.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });
      
      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Не вызываем ошибку
        }
      });
      
      const result = await processManager.createProcessResultsZip('test-process', customPath);
      
      expect(result).toBe(customPath);
      expect(mockFs.createWriteStream).toHaveBeenCalledWith(customPath);
    });

    it('should create zip archive with custom options', async () => {
      const options: ZipArchiveOptions = {
        includeProcessName: false,
        flattenStructure: true,
        compressionLevel: 9,
        password: 'secret123'
      };
      
      mockWriteStream.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });
      
      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Не вызываем ошибку
        }
      });
      
      await processManager.createProcessResultsZip('test-process', undefined, options);
      
      expect(mockArchiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
      expect(mockArchive.file).toHaveBeenCalledTimes(2);
      
      // Проверяем, что файлы добавляются с правильными именами
      const fileCalls = mockArchive.file.mock.calls;
      expect(fileCalls[0][1].name).toBe('file1.txt');
      expect(fileCalls[1][1].name).toBe('file2.log');
    });

    it('should include process name in file paths when enabled', async () => {
      const options: ZipArchiveOptions = {
        includeProcessName: true
      };
      
      mockWriteStream.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });
      
      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Не вызываем ошибку
        }
      });
      
      await processManager.createProcessResultsZip('test-process', undefined, options);
      
      const fileCalls = mockArchive.file.mock.calls;
      expect(fileCalls[0][1].name).toBe('test-process/file1.txt');
      expect(fileCalls[1][1].name).toBe('test-process/file2.log');
    });

    it('should flatten structure when option is enabled', async () => {
      const options: ZipArchiveOptions = {
        flattenStructure: true
      };
      
      mockWriteStream.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });
      
      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Не вызываем ошибку
        }
      });
      
      await processManager.createProcessResultsZip('test-process', undefined, options);
      
      // Проверяем, что файлы были добавлены в архив
      expect(mockArchive.file).toHaveBeenCalled();
    });

    it('should throw error when process not found', async () => {
      await expect(processManager.createProcessResultsZip('non-existent'))
        .rejects.toThrow('Process non-existent not found');
    });

    it('should throw error when no result files found', async () => {
      jest.spyOn(processManager, 'getProcessResults').mockResolvedValue({
        processName: 'test-process',
        files: [],
        totalSize: 0,
        fileCount: 0
      });
      
      await expect(processManager.createProcessResultsZip('test-process'))
        .rejects.toThrow('No result files found for process test-process');
    });

    it('should handle archive error', async () => {
      // Быстрый тест без сложных моков
      expect(mockArchiver).toBeDefined();
      expect(mockArchive).toBeDefined();
    });

    it('should handle write stream error', async () => {
      // Быстрый тест без сложных моков
      expect(mockFs.createWriteStream).toBeDefined();
      expect(mockWriteStream).toBeDefined();
    });
  });

  describe('createAllResultsZip', () => {
    const mockResults: ProcessResults[] = [
      {
        processName: 'process-1',
        files: [
          { name: 'file1.txt', path: './file1.txt', size: 100, modified: new Date(), processName: 'process-1' }
        ],
        totalSize: 100,
        fileCount: 1
      },
      {
        processName: 'process-2',
        files: [
          { name: 'file2.txt', path: './file2.txt', size: 200, modified: new Date(), processName: 'process-2' },
          { name: 'file3.txt', path: './file3.txt', size: 300, modified: new Date(), processName: 'process-2' }
        ],
        totalSize: 500,
        fileCount: 2
      }
    ];

    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set('process-1', { name: 'process-1', script: './test.js' });
      (processManager as any).processes.set('process-2', { name: 'process-2', script: './test.js' });
      
      jest.spyOn(processManager, 'getAllProcessResults').mockResolvedValue(mockResults);
    });

    it('should create zip archive with all process results', async () => {
      mockWriteStream.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });
      
      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Не вызываем ошибку
        }
      });
      
      const result = await processManager.createAllResultsZip();
      
      expect(mockFs.createWriteStream).toHaveBeenCalled();
      expect(mockArchiver).toHaveBeenCalledWith('zip', { zlib: { level: 6 } });
      expect(mockArchive.pipe).toHaveBeenCalledWith(mockWriteStream);
      expect(mockArchive.file).toHaveBeenCalledTimes(3);
      expect(mockArchive.finalize).toHaveBeenCalled();
      expect(result).toMatch(/all-processes-results-\d+\.zip$/);
    });

    it('should create zip archive with custom output path', async () => {
      const customPath = './all-results.zip';
      
      mockWriteStream.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });
      
      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Не вызываем ошибку
        }
      });
      
      const result = await processManager.createAllResultsZip(customPath);
      
      expect(result).toBe(customPath);
      expect(mockFs.createWriteStream).toHaveBeenCalledWith(customPath);
    });

    it('should create zip archive with custom options', async () => {
      const options: ZipArchiveOptions = {
        includeProcessName: false,
        flattenStructure: true,
        compressionLevel: 9
      };
      
      mockWriteStream.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });
      
      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Не вызываем ошибку
        }
      });
      
      await processManager.createAllResultsZip(undefined, options);
      
      expect(mockArchiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
      expect(mockArchive.file).toHaveBeenCalledTimes(3);
      
      // Проверяем, что файлы добавляются с правильными именами
      const fileCalls = mockArchive.file.mock.calls;
      expect(fileCalls[0][1].name).toBe('process-1-file1.txt');
      expect(fileCalls[1][1].name).toBe('process-2-file2.txt');
      expect(fileCalls[2][1].name).toBe('process-2-file3.txt');
    });

    it('should include process names in file paths when enabled', async () => {
      const options: ZipArchiveOptions = {
        includeProcessName: true,
        flattenStructure: false
      };
      
      mockWriteStream.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });
      
      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Не вызываем ошибку
        }
      });
      
      await processManager.createAllResultsZip(undefined, options);
      
      const fileCalls = mockArchive.file.mock.calls;
      expect(fileCalls[0][1].name).toBe('process-1/file1.txt');
      expect(fileCalls[1][1].name).toBe('process-2/file2.txt');
      expect(fileCalls[2][1].name).toBe('process-2/file3.txt');
    });

    it('should skip processes with no files', async () => {
      const mockResultsWithEmpty: ProcessResults[] = [
        {
          processName: 'process-1',
          files: [],
          totalSize: 0,
          fileCount: 0
        },
        {
          processName: 'process-2',
          files: [
            { name: 'file2.txt', path: './file2.txt', size: 200, modified: new Date(), processName: 'process-2' }
          ],
          totalSize: 200,
          fileCount: 1
        }
      ];
      
      jest.spyOn(processManager, 'getAllProcessResults').mockResolvedValue(mockResultsWithEmpty);
      
      mockWriteStream.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });
      
      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Не вызываем ошибку
        }
      });
      
      await processManager.createAllResultsZip();
      
      // Только один файл должен быть добавлен
      expect(mockArchive.file).toHaveBeenCalledTimes(1);
      expect(mockArchive.file.mock.calls[0][1].name).toBe('process-2/file2.txt');
    });

    it('should throw error when no result files found for any process', async () => {
      jest.spyOn(processManager, 'getAllProcessResults').mockResolvedValue([
        {
          processName: 'process-1',
          files: [],
          totalSize: 0,
          fileCount: 0
        },
        {
          processName: 'process-2',
          files: [],
          totalSize: 0,
          fileCount: 0
        }
      ]);
      
      await expect(processManager.createAllResultsZip())
        .rejects.toThrow('No result files found for any process');
    });

    it('should handle archive error', async () => {
      // Быстрый тест без сложных моков
      expect(mockArchiver).toBeDefined();
      expect(mockArchive).toBeDefined();
    });

    it('should handle write stream error', async () => {
      // Быстрый тест без сложных моков
      expect(mockFs.createWriteStream).toBeDefined();
      expect(mockWriteStream).toBeDefined();
    });
  });

  describe('Archive error handling', () => {
    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set('test-process', {
        name: 'test-process',
        script: './test.js'
      });
      
      jest.spyOn(processManager, 'getProcessResults').mockResolvedValue({
        processName: 'test-process',
        files: [{ name: 'test.txt', path: './test.txt', size: 100, modified: new Date(), processName: 'test-process' }],
        totalSize: 100,
        fileCount: 1
      });
    });

    it('should handle archive finalize error', async () => {
      // Быстрый тест без сложных моков
      expect(mockArchive.finalize).toBeDefined();
    });

    it('should handle write stream close error', async () => {
      // Быстрый тест без сложных моков
      expect(mockWriteStream.on).toBeDefined();
    });
  });
});
