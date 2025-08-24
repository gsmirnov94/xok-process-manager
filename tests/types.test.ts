import { jest } from '@jest/globals';
import {
  ProcessCallbacks,
  ProcessConfig,
  ProcessInfo,
  ProcessManagerOptions,
  ResultFile,
  ProcessResults,
  ZipArchiveOptions
} from '../src/types';

describe('Type Definitions', () => {
  describe('ProcessCallbacks', () => {
    it('should allow all callback types to be optional', () => {
      const callbacks: ProcessCallbacks = {};
      
      expect(callbacks).toBeDefined();
      expect(callbacks.onStart).toBeUndefined();
      expect(callbacks.onStop).toBeUndefined();
      expect(callbacks.onRestart).toBeUndefined();
      expect(callbacks.onDelete).toBeUndefined();
    });

    it('should allow synchronous callbacks', () => {
      const callbacks: ProcessCallbacks = {
        onStart: () => console.log('Started'),
        onStop: () => console.log('Stopped'),
        onRestart: () => console.log('Restarted'),
        onDelete: () => console.log('Deleted')
      };
      
      expect(callbacks.onStart).toBeDefined();
      expect(callbacks.onStop).toBeDefined();
      expect(callbacks.onRestart).toBeDefined();
      expect(callbacks.onDelete).toBeDefined();
    });

    it('should allow asynchronous callbacks', () => {
      const callbacks: ProcessCallbacks = {
        onStart: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log('Started async');
        },
        onStop: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log('Stopped async');
        }
      };
      
      expect(callbacks.onStart).toBeDefined();
      expect(callbacks.onStop).toBeDefined();
    });
  });

  describe('ProcessConfig', () => {
    it('should require name and script', () => {
      const config: ProcessConfig = {
        name: 'test-process',
        script: './test.js'
      };
      
      expect(config.name).toBe('test-process');
      expect(config.script).toBe('./test.js');
    });

    it('should allow all optional parameters', () => {
      const config: ProcessConfig = {
        name: 'full-process',
        script: './full.js',
        args: ['--env', 'production'],
        cwd: '/custom/path',
        env: { NODE_ENV: 'production', DEBUG: 'true' },
        instances: 4,
        execMode: 'cluster',
        watch: true,
        ignoreWatch: ['node_modules', 'logs'],
        maxMemoryRestart: '2G',
        errorFile: './error.log',
        outFile: './output.log',
        logFile: './combined.log',
        time: true,
        callbacks: {
          onStart: () => console.log('Started'),
          onStop: () => console.log('Stopped')
        },
        outputDirectory: './custom-output'
      };
      
      expect(config.args).toEqual(['--env', 'production']);
      expect(config.cwd).toBe('/custom/path');
      expect(config.env).toEqual({ NODE_ENV: 'production', DEBUG: 'true' });
      expect(config.instances).toBe(4);
      expect(config.execMode).toBe('cluster');
      expect(config.watch).toBe(true);
      expect(config.ignoreWatch).toEqual(['node_modules', 'logs']);
      expect(config.maxMemoryRestart).toBe('2G');
      expect(config.errorFile).toBe('./error.log');
      expect(config.outFile).toBe('./output.log');
      expect(config.logFile).toBe('./combined.log');
      expect(config.time).toBe(true);
      expect(config.callbacks).toBeDefined();
      expect(config.outputDirectory).toBe('./custom-output');
    });

    it('should allow execMode to be fork or cluster', () => {
      const forkConfig: ProcessConfig = {
        name: 'fork-process',
        script: './test.js',
        execMode: 'fork'
      };
      
      const clusterConfig: ProcessConfig = {
        name: 'cluster-process',
        script: './test.js',
        execMode: 'cluster'
      };
      
      expect(forkConfig.execMode).toBe('fork');
      expect(clusterConfig.execMode).toBe('cluster');
    });
  });

  describe('ProcessInfo', () => {
    it('should have all required properties with correct types', () => {
      const processInfo: ProcessInfo = {
        id: 12345,
        name: 'test-process',
        status: 'online',
        cpu: 25.5,
        memory: 1024000,
        uptime: 3600000,
        restarts: 2,
        pmId: 1
      };
      
      expect(typeof processInfo.id).toBe('number');
      expect(typeof processInfo.name).toBe('string');
      expect(typeof processInfo.status).toBe('string');
      expect(typeof processInfo.cpu).toBe('number');
      expect(typeof processInfo.memory).toBe('number');
      expect(typeof processInfo.uptime).toBe('number');
      expect(typeof processInfo.restarts).toBe('number');
      expect(typeof processInfo.pmId).toBe('number');
    });

    it('should allow various status values', () => {
      const statuses = ['online', 'stopped', 'stopping', 'launching', 'errored', 'one-launch-status'];
      
      statuses.forEach(status => {
        const processInfo: ProcessInfo = {
          id: 12345,
          name: 'test-process',
          status,
          cpu: 0,
          memory: 0,
          uptime: 0,
          restarts: 0,
          pmId: 1
        };
        
        expect(processInfo.status).toBe(status);
      });
    });
  });

  describe('ProcessManagerOptions', () => {
    it('should allow all optional parameters', () => {
      const options: ProcessManagerOptions = {
        maxProcesses: 20,
        autoRestart: false,
        logLevel: 'debug',
        defaultOutputDirectory: './custom-results'
      };
      
      expect(options.maxProcesses).toBe(20);
      expect(options.autoRestart).toBe(false);
      expect(options.logLevel).toBe('debug');
      expect(options.defaultOutputDirectory).toBe('./custom-results');
    });

    it('should allow logLevel to be specific values', () => {
      const logLevels: Array<'error' | 'warn' | 'info' | 'debug'> = ['error', 'warn', 'info', 'debug'];
      
      logLevels.forEach(level => {
        const options: ProcessManagerOptions = {
          logLevel: level
        };
        
        expect(options.logLevel).toBe(level);
      });
    });

    it('should allow empty options object', () => {
      const options: ProcessManagerOptions = {};
      
      expect(options).toBeDefined();
      expect(options.maxProcesses).toBeUndefined();
      expect(options.autoRestart).toBeUndefined();
      expect(options.logLevel).toBeUndefined();
      expect(options.defaultOutputDirectory).toBeUndefined();
    });
  });

  describe('ResultFile', () => {
    it('should have all required properties with correct types', () => {
      const resultFile: ResultFile = {
        name: 'test.txt',
        path: '/path/to/test.txt',
        size: 1024,
        modified: new Date('2023-01-01T00:00:00Z'),
        processName: 'test-process'
      };
      
      expect(typeof resultFile.name).toBe('string');
      expect(typeof resultFile.path).toBe('string');
      expect(typeof resultFile.size).toBe('number');
      expect(resultFile.modified instanceof Date).toBe(true);
      expect(typeof resultFile.processName).toBe('string');
    });

    it('should allow various file types', () => {
      const files: ResultFile[] = [
        {
          name: 'document.txt',
          path: '/path/to/document.txt',
          size: 1024,
          modified: new Date(),
          processName: 'process-1'
        },
        {
          name: 'image.png',
          path: '/path/to/image.png',
          size: 2048576,
          modified: new Date(),
          processName: 'process-2'
        },
        {
          name: 'data.json',
          path: '/path/to/data.json',
          size: 512,
          modified: new Date(),
          processName: 'process-3'
        }
      ];
      
      expect(files).toHaveLength(3);
      expect(files[0].name).toBe('document.txt');
      expect(files[1].name).toBe('image.png');
      expect(files[2].name).toBe('data.json');
    });
  });

  describe('ProcessResults', () => {
    it('should have all required properties with correct types', () => {
      const processResults: ProcessResults = {
        processName: 'test-process',
        files: [
          {
            name: 'file1.txt',
            path: '/path/to/file1.txt',
            size: 1024,
            modified: new Date(),
            processName: 'test-process'
          }
        ],
        totalSize: 1024,
        fileCount: 1
      };
      
      expect(typeof processResults.processName).toBe('string');
      expect(Array.isArray(processResults.files)).toBe(true);
      expect(typeof processResults.totalSize).toBe('number');
      expect(typeof processResults.fileCount).toBe('number');
    });

    it('should allow empty files array', () => {
      const processResults: ProcessResults = {
        processName: 'empty-process',
        files: [],
        totalSize: 0,
        fileCount: 0
      };
      
      expect(processResults.files).toEqual([]);
      expect(processResults.totalSize).toBe(0);
      expect(processResults.fileCount).toBe(0);
    });

    it('should calculate totalSize correctly', () => {
      const files: ResultFile[] = [
        { name: 'file1.txt', path: '/file1.txt', size: 100, modified: new Date(), processName: 'test' },
        { name: 'file2.txt', path: '/file2.txt', size: 200, modified: new Date(), processName: 'test' },
        { name: 'file3.txt', path: '/file3.txt', size: 300, modified: new Date(), processName: 'test' }
      ];
      
      const processResults: ProcessResults = {
        processName: 'test-process',
        files,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        fileCount: files.length
      };
      
      expect(processResults.totalSize).toBe(600);
      expect(processResults.fileCount).toBe(3);
    });
  });

  describe('ZipArchiveOptions', () => {
    it('should allow all optional parameters', () => {
      const options: ZipArchiveOptions = {
        includeProcessName: true,
        flattenStructure: false,
        compressionLevel: 9,
        password: 'secret123'
      };
      
      expect(options.includeProcessName).toBe(true);
      expect(options.flattenStructure).toBe(false);
      expect(options.compressionLevel).toBe(9);
      expect(options.password).toBe('secret123');
    });

    it('should allow empty options object', () => {
      const options: ZipArchiveOptions = {};
      
      expect(options).toBeDefined();
      expect(options.includeProcessName).toBeUndefined();
      expect(options.flattenStructure).toBeUndefined();
      expect(options.compressionLevel).toBeUndefined();
      expect(options.password).toBeUndefined();
    });

    it('should allow compression level range', () => {
      const compressionLevels = [0, 1, 3, 6, 9];
      
      compressionLevels.forEach(level => {
        const options: ZipArchiveOptions = {
          compressionLevel: level
        };
        
        expect(options.compressionLevel).toBe(level);
      });
    });
  });

  describe('Type Compatibility', () => {
    it('should allow ProcessConfig to be used with ProcessCallbacks', () => {
      const callbacks: ProcessCallbacks = {
        onStart: () => console.log('Started'),
        onStop: () => console.log('Stopped')
      };
      
      const config: ProcessConfig = {
        name: 'test-process',
        script: './test.js',
        callbacks
      };
      
      expect(config.callbacks).toBe(callbacks);
      expect(config.callbacks?.onStart).toBeDefined();
      expect(config.callbacks?.onStop).toBeDefined();
    });

    it('should allow ProcessResults to contain ResultFile array', () => {
      const resultFiles: ResultFile[] = [
        {
          name: 'test.txt',
          path: '/test.txt',
          size: 100,
          modified: new Date(),
          processName: 'test-process'
        }
      ];
      
      const processResults: ProcessResults = {
        processName: 'test-process',
        files: resultFiles,
        totalSize: resultFiles.reduce((sum, file) => sum + file.size, 0),
        fileCount: resultFiles.length
      };
      
      expect(processResults.files).toBe(resultFiles);
      expect(processResults.files[0]).toBe(resultFiles[0]);
    });

    it('should allow ProcessManagerOptions to be used in constructor', () => {
      const options: ProcessManagerOptions = {
        maxProcesses: 10,
        autoRestart: true,
        logLevel: 'info',
        defaultOutputDirectory: './results'
      };
      
      // Это проверка типов - если типы несовместимы, TypeScript выдаст ошибку
      expect(options).toBeDefined();
      expect(typeof options.maxProcesses).toBe('number');
      expect(typeof options.autoRestart).toBe('boolean');
      expect(typeof options.logLevel).toBe('string');
      expect(typeof options.defaultOutputDirectory).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long process names', () => {
      const longName = 'a'.repeat(1000);
      
      const config: ProcessConfig = {
        name: longName,
        script: './test.js'
      };
      
      expect(config.name).toBe(longName);
      expect(config.name.length).toBe(1000);
    });

    it('should handle very large file sizes', () => {
      const largeSize = Number.MAX_SAFE_INTEGER;
      
      const resultFile: ResultFile = {
        name: 'large-file.bin',
        path: '/large-file.bin',
        size: largeSize,
        modified: new Date(),
        processName: 'test-process'
      };
      
      expect(resultFile.size).toBe(largeSize);
    });

    it('should handle special characters in file names', () => {
      const specialNames = [
        'file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt',
        'file.with.dots.txt',
        'file@#$%^&*().txt',
        'файл-с-кириллицей.txt',
        'ファイル名.txt'
      ];
      
      specialNames.forEach(name => {
        const resultFile: ResultFile = {
          name,
          path: `/path/to/${name}`,
          size: 100,
          modified: new Date(),
          processName: 'test-process'
        };
        
        expect(resultFile.name).toBe(name);
      });
    });

    it('should handle empty strings and zero values', () => {
      const config: ProcessConfig = {
        name: '',
        script: '',
        args: [],
        cwd: '',
        env: {},
        instances: 0,
        execMode: 'fork',
        watch: false,
        ignoreWatch: [],
        maxMemoryRestart: '',
        errorFile: '',
        outFile: '',
        logFile: '',
        time: false
      };
      
      expect(config.name).toBe('');
      expect(config.script).toBe('');
      expect(config.args).toEqual([]);
      expect(config.cwd).toBe('');
      expect(config.env).toEqual({});
      expect(config.instances).toBe(0);
      expect(config.watch).toBe(false);
      expect(config.ignoreWatch).toEqual([]);
      expect(config.time).toBe(false);
    });
  });
});
