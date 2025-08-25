import { 
  ProcessCallbacks, 
  ProcessConfig, 
  ProcessInfo, 
  ProcessManagerOptions, 
  ResultFile, 
  ProcessResults, 
  ZipArchiveOptions 
} from '../types';

describe('Types', () => {
  describe('ProcessCallbacks', () => {
    it('should allow all callback properties to be optional', () => {
      const callbacks: ProcessCallbacks = {};
      expect(callbacks).toBeDefined();
    });

    it('should allow async callbacks', () => {
      const callbacks: ProcessCallbacks = {
        onStart: async () => Promise.resolve(),
        onStop: async () => Promise.resolve(),
        onRestart: async () => Promise.resolve(),
        onDelete: async () => Promise.resolve()
      };
      expect(callbacks.onStart).toBeDefined();
      expect(callbacks.onStop).toBeDefined();
      expect(callbacks.onRestart).toBeDefined();
      expect(callbacks.onDelete).toBeDefined();
    });

    it('should allow sync callbacks', () => {
      const callbacks: ProcessCallbacks = {
        onStart: () => {},
        onStop: () => {},
        onRestart: () => {},
        onDelete: () => {}
      };
      expect(callbacks.onStart).toBeDefined();
      expect(callbacks.onStop).toBeDefined();
      expect(callbacks.onRestart).toBeDefined();
      expect(callbacks.onDelete).toBeDefined();
    });
  });

  describe('ProcessConfig', () => {
    it('should require name and script properties', () => {
      const config: ProcessConfig = {
        name: 'test-process',
        script: 'test.js'
      };
      expect(config.name).toBe('test-process');
      expect(config.script).toBe('test.js');
    });

    it('should allow all optional properties', () => {
      const config: ProcessConfig = {
        name: 'test-process',
        script: 'test.js',
        args: ['--env', 'production'],
        cwd: '/path/to/working/directory',
        env: { NODE_ENV: 'production' },
        instances: 4,
        execMode: 'cluster',
        watch: true,
        ignoreWatch: ['node_modules', 'logs'],
        maxMemoryRestart: '1G',
        errorFile: 'error.log',
        outFile: 'output.log',
        logFile: 'combined.log',
        time: true,
        callbacks: {
          onStart: () => console.log('Started'),
          onStop: () => console.log('Stopped')
        },
        outputDirectory: '/path/to/output'
      };
      
      expect(config.args).toEqual(['--env', 'production']);
      expect(config.cwd).toBe('/path/to/working/directory');
      expect(config.env).toEqual({ NODE_ENV: 'production' });
      expect(config.instances).toBe(4);
      expect(config.execMode).toBe('cluster');
      expect(config.watch).toBe(true);
      expect(config.ignoreWatch).toEqual(['node_modules', 'logs']);
      expect(config.maxMemoryRestart).toBe('1G');
      expect(config.errorFile).toBe('error.log');
      expect(config.outFile).toBe('output.log');
      expect(config.logFile).toBe('combined.log');
      expect(config.time).toBe(true);
      expect(config.callbacks).toBeDefined();
      expect(config.outputDirectory).toBe('/path/to/output');
    });

    it('should validate execMode values', () => {
      const forkConfig: ProcessConfig = {
        name: 'fork-process',
        script: 'test.js',
        execMode: 'fork'
      };
      
      const clusterConfig: ProcessConfig = {
        name: 'cluster-process',
        script: 'test.js',
        execMode: 'cluster'
      };

      expect(forkConfig.execMode).toBe('fork');
      expect(clusterConfig.execMode).toBe('cluster');
    });
  });

  describe('ProcessInfo', () => {
    it('should have all required properties with correct types', () => {
      const processInfo: ProcessInfo = {
        id: 1,
        name: 'test-process',
        status: 'online',
        cpu: 2.5,
        memory: 1024,
        uptime: 3600,
        restarts: 0,
        pmId: 12345
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
  });

  describe('ProcessManagerOptions', () => {
    it('should allow all properties to be optional', () => {
      const options: ProcessManagerOptions = {};
      expect(options).toBeDefined();
    });

    it('should allow setting defaultOutputDirectory and scriptsDirectory', () => {
      const options: ProcessManagerOptions = {
        defaultOutputDirectory: '/default/output',
        scriptsDirectory: '/scripts'
      };
      
      expect(options.defaultOutputDirectory).toBe('/default/output');
      expect(options.scriptsDirectory).toBe('/scripts');
    });
  });

  describe('ResultFile', () => {
    it('should have all required properties with correct types', () => {
      const resultFile: ResultFile = {
        name: 'output.txt',
        path: '/path/to/output.txt',
        size: 1024,
        modified: new Date('2024-01-01T00:00:00Z'),
        processName: 'test-process'
      };

      expect(typeof resultFile.name).toBe('string');
      expect(typeof resultFile.path).toBe('string');
      expect(typeof resultFile.size).toBe('number');
      expect(resultFile.modified instanceof Date).toBe(true);
      expect(typeof resultFile.processName).toBe('string');
    });
  });

  describe('ProcessResults', () => {
    it('should have all required properties with correct types', () => {
      const processResults: ProcessResults = {
        processName: 'test-process',
        files: [
          {
            name: 'output1.txt',
            path: '/path/to/output1.txt',
            size: 512,
            modified: new Date('2024-01-01T00:00:00Z'),
            processName: 'test-process'
          },
          {
            name: 'output2.txt',
            path: '/path/to/output2.txt',
            size: 1024,
            modified: new Date('2024-01-01T00:00:00Z'),
            processName: 'test-process'
          }
        ],
        totalSize: 1536,
        fileCount: 2
      };

      expect(typeof processResults.processName).toBe('string');
      expect(Array.isArray(processResults.files)).toBe(true);
      expect(typeof processResults.totalSize).toBe('number');
      expect(typeof processResults.fileCount).toBe('number');
      expect(processResults.files.length).toBe(2);
    });
  });

  describe('ZipArchiveOptions', () => {
    it('should allow all properties to be optional', () => {
      const options: ZipArchiveOptions = {};
      expect(options).toBeDefined();
    });

    it('should allow setting all properties', () => {
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

    it('should validate compressionLevel range', () => {
      const options: ZipArchiveOptions = {
        compressionLevel: 0
      };
      
      expect(options.compressionLevel).toBe(0);
      
      const highCompression: ZipArchiveOptions = {
        compressionLevel: 9
      };
      
      expect(highCompression.compressionLevel).toBe(9);
    });
  });

  describe('Type compatibility', () => {
    it('should allow ProcessConfig to be used with ProcessCallbacks', () => {
      const callbacks: ProcessCallbacks = {
        onStart: () => console.log('Started')
      };
      
      const config: ProcessConfig = {
        name: 'test',
        script: 'test.js',
        callbacks
      };
      
      expect(config.callbacks).toBe(callbacks);
    });

    it('should allow ProcessResults to contain ResultFile array', () => {
      const files: ResultFile[] = [
        {
          name: 'test.txt',
          path: '/test.txt',
          size: 100,
          modified: new Date(),
          processName: 'test-process'
        }
      ];
      
      const results: ProcessResults = {
        processName: 'test-process',
        files,
        totalSize: 100,
        fileCount: 1
      };
      
      expect(results.files).toBe(files);
      expect(results.files.length).toBe(1);
    });
  });
});
