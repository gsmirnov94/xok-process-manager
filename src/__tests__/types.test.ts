import type {
  ProcessCallbacks,
  ProcessConfig,
  ProcessInfo,
  ProcessManagerOptions,
  ResultFile,
  ProcessResults,
  ZipArchiveOptions,
} from '../types';

describe('types.ts compile-time conformance', () => {
  function acceptProcessConfig(config: ProcessConfig): ProcessConfig {
    return config;
  }

  function acceptProcessInfo(info: ProcessInfo): ProcessInfo {
    return info;
  }

  function acceptProcessResults(results: ProcessResults): ProcessResults {
    return results;
  }

  test('ProcessConfig allows optional fields and literal execMode', () => {
    const callbacks: ProcessCallbacks = {
      onStart: () => {},
      onStop: async () => {},
      onRestart: () => Promise.resolve(),
      onDelete: async () => {},
    };

    const base: ProcessConfig = acceptProcessConfig({
      name: 'proc',
      script: 'script.js',
    });
    expect(base.name).toBe('proc');

    const full: ProcessConfig = acceptProcessConfig({
      name: 'proc2',
      script: 'script2.js',
      args: ['--flag', 'value'],
      cwd: '/tmp',
      env: { NODE_ENV: 'test', CUSTOM: 'x' },
      instances: 2,
      execMode: 'cluster',
      watch: true,
      ignoreWatch: ['node_modules'],
      maxMemoryRestart: '200M',
      errorFile: 'err.log',
      outFile: 'out.log',
      logFile: 'combined.log',
      time: true,
      callbacks,
      outputDirectory: './out',
    });
    expect(full.execMode).toBe('cluster');
  });

  test('ProcessManagerOptions accepts directories', () => {
    const opts: ProcessManagerOptions = {
      defaultOutputDirectory: './results',
      scriptsDirectory: './process-scripts',
    };
    expect(Object.keys(opts).length).toBe(2);
  });

  test('ProcessInfo structure compiles', () => {
    const info: ProcessInfo = acceptProcessInfo({
      id: 1,
      name: 'p',
      status: 'online',
      cpu: 1.2,
      memory: 1024,
      uptime: 123,
      restarts: 0,
      pmId: 1,
    });
    expect(info.name).toBe('p');
  });

  test('ResultFile and ProcessResults structures compile', () => {
    const file: ResultFile = {
      name: 'a.txt',
      path: '/abs/a.txt',
      size: 10,
      modified: new Date(),
      processName: 'p',
    };
    const results: ProcessResults = acceptProcessResults({
      processName: 'p',
      files: [file],
      totalSize: 10,
      fileCount: 1,
    });
    expect(results.fileCount).toBe(1);
  });

  test('ZipArchiveOptions fields are optional', () => {
    const a: ZipArchiveOptions = {};
    const b: ZipArchiveOptions = {
      includeProcessName: true,
      flattenStructure: false,
      compressionLevel: 9,
      password: 'secret',
    };
    expect(a).toBeDefined();
    expect(b.compressionLevel).toBe(9);
  });
});


