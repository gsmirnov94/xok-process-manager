import { jest } from '@jest/globals';
import { ProcessManager } from '../src/process-manager';
import { ProcessConfig, ProcessCallbacks, ProcessInfo, ProcessManagerOptions } from '../src/types';

// Мокаем модули
const mockPm2 = require('pm2');
const mockFs = require('fs');
const mockPath = require('path');
const mockArchiver = require('archiver');

describe('ProcessManager', () => {
  let processManager: ProcessManager;
  let mockOptions: ProcessManagerOptions;

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
  });

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      const manager = new ProcessManager();
      expect(manager).toBeInstanceOf(ProcessManager);
    });

    it('should create instance with custom options', () => {
      const customOptions: ProcessManagerOptions = {
        maxProcesses: 20,
        autoRestart: false,
        logLevel: 'debug',
        defaultOutputDirectory: './custom-results'
      };
      
      const manager = new ProcessManager(customOptions);
      expect(manager).toBeInstanceOf(ProcessManager);
    });

    it('should create output directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      new ProcessManager(mockOptions);
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('./test-results', { recursive: true });
    });

    it('should handle error when creating output directory', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => new ProcessManager(mockOptions)).not.toThrow();
    });
  });

  describe('init', () => {
    it('should initialize PM2 connection successfully', async () => {
      mockPm2.connect.mockImplementation((callback) => callback(null));
      
      await expect(processManager.init()).resolves.toBeUndefined();
      expect(mockPm2.connect).toHaveBeenCalled();
    });

    it('should handle PM2 connection error', async () => {
      const error = new Error('Connection failed');
      mockPm2.connect.mockImplementation((callback) => callback(error));
      
      await expect(processManager.init()).rejects.toThrow('Connection failed');
    });
  });

  describe('createProcess', () => {
    const mockConfig: ProcessConfig = {
      name: 'test-process',
      script: './test.js',
      instances: 1,
      exec_mode: 'fork'
    };

    beforeEach(async () => {
      await processManager.init();
    });

    it('should create process successfully', async () => {
      const mockProc = [{ pm2_env: { pm_id: 123 } }];
      mockPm2.start.mockImplementation((config, callback) => callback(null, mockProc));
      
      const result = await processManager.createProcess(mockConfig);
      
      expect(result).toBe(123);
      expect(mockPm2.start).toHaveBeenCalled();
    });

    it('should throw error when max processes reached', async () => {
      // Создаем максимальное количество процессов
      for (let i = 0; i < 5; i++) {
        (processManager as any).processes.set(`process-${i}`, mockConfig);
      }
      
      await expect(processManager.createProcess(mockConfig))
        .rejects.toThrow('Maximum number of processes (5) reached');
    });

    it('should handle PM2 start error', async () => {
      const error = new Error('Start failed');
      mockPm2.start.mockImplementation((config, callback) => callback(error));
      
      await expect(processManager.createProcess(mockConfig))
        .rejects.toThrow('Start failed');
    });

    it('should execute onStart callback when provided', async () => {
      const onStartMock = jest.fn().mockReturnValue(undefined);
      const configWithCallback = { ...mockConfig, callbacks: { onStart: onStartMock } } as any;
      
      mockPm2.start.mockImplementation((config, callback) => callback(null, [{ pm2_env: { pm_id: 123 } }]));
      
      await processManager.createProcess(configWithCallback);
      
      expect(onStartMock).toHaveBeenCalled();
    });

    it('should handle callback error gracefully', async () => {
      const onStartMock = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const configWithCallback = { ...mockConfig, callbacks: { onStart: onStartMock } } as any;
      
      mockPm2.start.mockImplementation((config, callback) => callback(null, [{ pm2_env: { pm_id: 123 } }]));
      
      await expect(processManager.createProcess(configWithCallback)).resolves.toBe(123);
      expect(onStartMock).toHaveBeenCalled();
    });

    it('should create process with all optional parameters', async () => {
      const fullConfig: ProcessConfig = {
        ...mockConfig,
        args: ['--env', 'production'],
        cwd: '/custom/path',
        env: { NODE_ENV: 'production' },
        instances: 4,
        exec_mode: 'cluster',
        watch: true,
        ignore_watch: ['node_modules'],
        max_memory_restart: '1G',
        error_file: './error.log',
        out_file: './output.log',
        log_file: './combined.log',
        time: true
      };
      
      mockPm2.start.mockImplementation((config, callback) => callback(null, [{ pm2_env: { pm_id: 123 } }]));
      
      await expect(processManager.createProcess(fullConfig)).resolves.toBe(123);
      
      const pm2Config = mockPm2.start.mock.calls[0][0];
      expect(pm2Config.args).toEqual(['--env', 'production']);
      expect(pm2Config.cwd).toBe('/custom/path');
      expect(pm2Config.env).toEqual({ NODE_ENV: 'production' });
      expect(pm2Config.instances).toBe(4);
      expect(pm2Config.exec_mode).toBe('cluster');
      expect(pm2Config.watch).toBe(true);
      expect(pm2Config.ignore_watch).toEqual(['node_modules']);
      expect(pm2Config.max_memory_restart).toBe('1G');
      expect(pm2Config.time).toBe(true);
    });
  });

  describe('startProcess', () => {
    const processName = 'test-process';
    const mockConfig: ProcessConfig = {
      name: processName,
      script: './test.js'
    };

    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set(processName, mockConfig);
    });

    it('should start process successfully', async () => {
      mockPm2.start.mockImplementation((name, callback) => callback(null));
      
      await expect(processManager.startProcess(processName)).resolves.toBeUndefined();
      expect(mockPm2.start).toHaveBeenCalledWith(processName, expect.any(Function));
    });

    it('should throw error when process not found', async () => {
      await expect(processManager.startProcess('non-existent'))
        .rejects.toThrow('Process non-existent not found');
    });

    it('should handle PM2 start error', async () => {
      const error = new Error('Start failed');
      mockPm2.start.mockImplementation((name, callback) => callback(error));
      
      await expect(processManager.startProcess(processName))
        .rejects.toThrow('Start failed');
    });

    it('should execute onStart callback', async () => {
      const onStartMock = jest.fn();
      const configWithCallback = { ...mockConfig, callbacks: { onStart: onStartMock } };
      (processManager as any).processes.set(processName, configWithCallback);
      
      mockPm2.start.mockImplementation((name, callback) => callback(null));
      
      await processManager.startProcess(processName);
      expect(onStartMock).toHaveBeenCalled();
    });
  });

  describe('stopProcess', () => {
    const processName = 'test-process';
    const mockConfig: ProcessConfig = {
      name: processName,
      script: './test.js'
    };

    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set(processName, mockConfig);
    });

    it('should stop process successfully', async () => {
      mockPm2.stop.mockImplementation((name, callback) => callback(null));
      
      await expect(processManager.stopProcess(processName)).resolves.toBeUndefined();
      expect(mockPm2.stop).toHaveBeenCalledWith(processName, expect.any(Function));
    });

    it('should throw error when process not found', async () => {
      await expect(processManager.stopProcess('non-existent'))
        .rejects.toThrow('Process non-existent not found');
    });

    it('should handle PM2 stop error', async () => {
      const error = new Error('Stop failed');
      mockPm2.stop.mockImplementation((name, callback) => callback(error));
      
      await expect(processManager.stopProcess(processName))
        .rejects.toThrow('Stop failed');
    });

    it('should execute onStop callback', async () => {
      const onStopMock = jest.fn();
      const configWithCallback = { ...mockConfig, callbacks: { onStop: onStopMock } };
      (processManager as any).processes.set(processName, configWithCallback);
      
      mockPm2.stop.mockImplementation((name, callback) => callback(null));
      
      await processManager.stopProcess(processName);
      expect(onStopMock).toHaveBeenCalled();
    });
  });

  describe('restartProcess', () => {
    const processName = 'test-process';
    const mockConfig: ProcessConfig = {
      name: processName,
      script: './test.js'
    };

    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set(processName, mockConfig);
    });

    it('should restart process successfully', async () => {
      mockPm2.restart.mockImplementation((name, callback) => callback(null));
      
      await expect(processManager.restartProcess(processName)).resolves.toBeUndefined();
      expect(mockPm2.restart).toHaveBeenCalledWith(processName, expect.any(Function));
    });

    it('should throw error when process not found', async () => {
      await expect(processManager.restartProcess('non-existent'))
        .rejects.toThrow('Process non-existent not found');
    });

    it('should handle PM2 restart error', async () => {
      const error = new Error('Restart failed');
      mockPm2.restart.mockImplementation((name, callback) => callback(error));
      
      await expect(processManager.restartProcess(processName))
        .rejects.toThrow('Restart failed');
    });

    it('should execute onRestart callback', async () => {
      const onRestartMock = jest.fn();
      const configWithCallback = { ...mockConfig, callbacks: { onRestart: onRestartMock } };
      (processManager as any).processes.set(processName, configWithCallback);
      
      mockPm2.restart.mockImplementation((name, callback) => callback(null));
      
      await processManager.restartProcess(processName);
      expect(onRestartMock).toHaveBeenCalled();
    });
  });

  describe('deleteProcess', () => {
    const processName = 'test-process';
    const mockConfig: ProcessConfig = {
      name: processName,
      script: './test.js'
    };

    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set(processName, mockConfig);
    });

    it('should delete process successfully', async () => {
      mockPm2.delete.mockImplementation((name, callback) => callback(null));
      
      await expect(processManager.deleteProcess(processName)).resolves.toBeUndefined();
      expect(mockPm2.delete).toHaveBeenCalledWith(processName, expect.any(Function));
      expect((processManager as any).processes.has(processName)).toBe(false);
    });

    it('should throw error when process not found', async () => {
      await expect(processManager.deleteProcess('non-existent'))
        .rejects.toThrow('Process non-existent not found');
    });

    it('should handle PM2 delete error', async () => {
      const error = new Error('Delete failed');
      mockPm2.delete.mockImplementation((name, callback) => callback(error));
      
      await expect(processManager.deleteProcess(processName))
        .rejects.toThrow('Delete failed');
    });

    it('should execute onDelete callback', async () => {
      const onDeleteMock = jest.fn();
      const configWithCallback = { ...mockConfig, callbacks: { onDelete: onDeleteMock } };
      (processManager as any).processes.set(processName, configWithCallback);
      
      mockPm2.delete.mockImplementation((name, callback) => callback(null));
      
      await processManager.deleteProcess(processName);
      expect(onDeleteMock).toHaveBeenCalled();
    });
  });

  describe('getProcessInfo', () => {
    beforeEach(async () => {
      await processManager.init();
    });

    it('should return process info successfully', async () => {
      const mockProcess = [{
        pid: 12345,
        name: 'test-process',
        pm2_env: {
          status: 'online',
          pm_uptime: 1000,
          restart_time: 2,
          pm_id: 1
        },
        monit: {
          cpu: 25.5,
          memory: 1024000
        }
      }];
      
      mockPm2.describe.mockImplementation((name, callback) => callback(null, mockProcess));
      
      const result = await processManager.getProcessInfo('test-process');
      
      expect(result).toEqual({
        id: 12345,
        name: 'test-process',
        status: 'online',
        cpu: 25.5,
        memory: 1024000,
        uptime: 1000,
        restarts: 2,
        pm_id: 1
      });
    });

    it('should return null when process not found', async () => {
      mockPm2.describe.mockImplementation((name, callback) => callback(null, []));
      
      const result = await processManager.getProcessInfo('non-existent');
      expect(result).toBeNull();
    });

    it('should handle PM2 describe error', async () => {
      mockPm2.describe.mockImplementation((name, callback) => callback(new Error('Describe failed'), null));
      
      const result = await processManager.getProcessInfo('test-process');
      expect(result).toBeNull();
    });
  });

  describe('getAllProcesses', () => {
    beforeEach(async () => {
      await processManager.init();
    });

    it('should return all processes successfully', async () => {
      const mockProcesses = [
        {
          pid: 12345,
          name: 'process-1',
          pm2_env: { status: 'online', pm_uptime: 1000, restart_time: 1, pm_id: 1 },
          monit: { cpu: 25.5, memory: 1024000 }
        },
        {
          pid: 67890,
          name: 'process-2',
          pm2_env: { status: 'stopped', pm_uptime: 0, restart_time: 0, pm_id: 2 },
          monit: { cpu: 0, memory: 0 }
        }
      ];
      
      mockPm2.list.mockImplementation((callback) => callback(null, mockProcesses));
      
      const result = await processManager.getAllProcesses();
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('process-1');
      expect(result[1].name).toBe('process-2');
    });

    it('should return empty array when no processes', async () => {
      mockPm2.list.mockImplementation((callback) => callback(null, []));
      
      const result = await processManager.getAllProcesses();
      expect(result).toEqual([]);
    });

    it('should handle PM2 list error', async () => {
      mockPm2.list.mockImplementation((callback) => callback(new Error('List failed'), null));
      
      const result = await processManager.getAllProcesses();
      expect(result).toEqual([]);
    });
  });

  describe('getProcessStatus', () => {
    beforeEach(async () => {
      await processManager.init();
    });

    it('should return process status', async () => {
      const mockProcess = [{
        pm2_env: { status: 'online' }
      }];
      
      mockPm2.describe.mockImplementation((name, callback) => callback(null, mockProcess));
      
      const result = await processManager.getProcessStatus('test-process');
      expect(result).toBe('online');
    });

    it('should return not_found when process not found', async () => {
      mockPm2.describe.mockImplementation((name, callback) => callback(null, []));
      
      const result = await processManager.getProcessStatus('non-existent');
      expect(result).toBe('not_found');
    });
  });

  describe('stopAllProcesses', () => {
    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set('process-1', { name: 'process-1', script: './test.js' });
      (processManager as any).processes.set('process-2', { name: 'process-2', script: './test.js' });
    });

    it('should stop all processes successfully', async () => {
      mockPm2.stop.mockImplementation((name, callback) => callback(null));
      
      await expect(processManager.stopAllProcesses()).resolves.toBeUndefined();
      expect(mockPm2.stop).toHaveBeenCalledWith('all', expect.any(Function));
    });

    it('should handle PM2 stop error', async () => {
      const error = new Error('Stop all failed');
      mockPm2.stop.mockImplementation((name, callback) => callback(error));
      
      await expect(processManager.stopAllProcesses()).rejects.toThrow('Stop all failed');
    });

    it('should execute onStop callbacks for all processes', async () => {
      const onStopMock1 = jest.fn();
      const onStopMock2 = jest.fn();
      
      (processManager as any).processes.set('process-1', { 
        name: 'process-1', 
        script: './test.js',
        callbacks: { onStop: onStopMock1 }
      });
      (processManager as any).processes.set('process-2', { 
        name: 'process-2', 
        script: './test.js',
        callbacks: { onStop: onStopMock2 }
      });
      
      mockPm2.stop.mockImplementation((name, callback) => callback(null));
      
      await processManager.stopAllProcesses();
      
      expect(onStopMock1).toHaveBeenCalled();
      expect(onStopMock2).toHaveBeenCalled();
    });
  });

  describe('restartAllProcesses', () => {
    beforeEach(async () => {
      await processManager.init();
      (processManager as any).processes.set('process-1', { name: 'process-1', script: './test.js' });
      (processManager as any).processes.set('process-2', { name: 'process-2', script: './test.js' });
    });

    it('should restart all processes successfully', async () => {
      mockPm2.restart.mockImplementation((name, callback) => callback(null));
      
      await expect(processManager.restartAllProcesses()).resolves.toBeUndefined();
      expect(mockPm2.restart).toHaveBeenCalledWith('all', expect.any(Function));
    });

    it('should handle PM2 restart error', async () => {
      const error = new Error('Restart all failed');
      mockPm2.restart.mockImplementation((name, callback) => callback(error));
      
      await expect(processManager.restartAllProcesses()).rejects.toThrow('Restart all failed');
    });

    it('should execute onRestart callbacks for all processes', async () => {
      const onRestartMock1 = jest.fn();
      const onRestartMock2 = jest.fn();
      
      (processManager as any).processes.set('process-1', { 
        name: 'process-1', 
        script: './test.js',
        callbacks: { onRestart: onRestartMock1 }
      });
      (processManager as any).processes.set('process-2', { 
        name: 'process-2', 
        script: './test.js',
        callbacks: { onRestart: onRestartMock2 }
      });
      
      mockPm2.restart.mockImplementation((name, callback) => callback(null));
      
      await processManager.restartAllProcesses();
      
      expect(onRestartMock1).toHaveBeenCalled();
      expect(onRestartMock2).toHaveBeenCalled();
    });
  });

  describe('Utility methods', () => {
    beforeEach(async () => {
      await processManager.init();
    });

    it('should return active process count', () => {
      (processManager as any).processes.set('process-1', {});
      (processManager as any).processes.set('process-2', {});
      
      expect(processManager.getActiveProcessCount()).toBe(2);
    });

    it('should check if process exists', () => {
      (processManager as any).processes.set('test-process', {});
      
      expect(processManager.hasProcess('test-process')).toBe(true);
      expect(processManager.hasProcess('non-existent')).toBe(false);
    });

    it('should return process names', () => {
      (processManager as any).processes.set('process-1', {});
      (processManager as any).processes.set('process-2', {});
      
      const names = processManager.getProcessNames();
      expect(names).toContain('process-1');
      expect(names).toContain('process-2');
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await processManager.init();
    });

    it('should disconnect from PM2 successfully', () => {
      (processManager as any).isConnected = true;
      
      processManager.disconnect();
      
      expect(mockPm2.disconnect).toHaveBeenCalled();
      expect((processManager as any).isConnected).toBe(false);
    });

    it('should handle disconnect error gracefully', () => {
      (processManager as any).isConnected = true;
      mockPm2.disconnect.mockImplementation(() => {
        throw new Error('Disconnect failed');
      });
      
      expect(() => processManager.disconnect()).not.toThrow();
    });
  });

  describe('forceShutdown', () => {
    beforeEach(async () => {
      await processManager.init();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should force shutdown successfully', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      (processManager as any).processes.set('process-1', { name: 'process-1', script: './test.js' });
      mockPm2.stop.mockImplementation((name, callback) => callback(null));
      
      await processManager.forceShutdown();
      
      expect(mockPm2.stop).toHaveBeenCalledWith('all', expect.any(Function));
      expect(mockPm2.disconnect).toHaveBeenCalled();
      
      jest.advanceTimersByTime(2000);
      expect(exitSpy).toHaveBeenCalledWith(0);
      
      exitSpy.mockRestore();
    });

    it('should handle shutdown error', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      mockPm2.stop.mockImplementation((name, callback) => callback(new Error('Stop failed')));
      
      await processManager.forceShutdown();
      
      jest.advanceTimersByTime(2000);
      // Проверяем, что exit был вызван (с любым кодом)
      expect(exitSpy).toHaveBeenCalled();
      
      exitSpy.mockRestore();
    });
  });

  describe('defaultProcessConfig', () => {
    it('should merge default config with process config', async () => {
      const processManager = new ProcessManager({
        defaultProcessConfig: {
          instances: 2,
          exec_mode: 'cluster',
          env: { NODE_ENV: 'production' },
          callbacks: {
            onStart: () => console.log('Default onStart')
          }
        }
      });

      await processManager.init();

      const processId = await processManager.createProcess({
        name: 'test-process',
        script: './test.js',
        env: { CUSTOM_VAR: 'test' }
      });

      expect(processId).toBeDefined();
      
      // Проверяем, что конфигурация объединена
      const savedConfig = (processManager as any).processes.get('test-process');
      expect(savedConfig.instances).toBe(2);
      expect(savedConfig.exec_mode).toBe('cluster');
      expect(savedConfig.env.NODE_ENV).toBe('production');
      expect(savedConfig.env.CUSTOM_VAR).toBe('test');
      expect(savedConfig.callbacks?.onStart).toBeDefined();

      await processManager.deleteProcess('test-process');
      processManager.disconnect();
    });

    it('should override default config with process config', async () => {
      const processManager = new ProcessManager({
        defaultProcessConfig: {
          instances: 2,
          exec_mode: 'cluster'
        }
      });

      await processManager.init();

      const processId = await processManager.createProcess({
        name: 'test-process-override',
        script: './test.js',
        instances: 1,
        exec_mode: 'fork'
      });

      expect(processId).toBeDefined();
      
      // Проверяем, что переданная конфигурация переопределяет значения по умолчанию
      const savedConfig = (processManager as any).processes.get('test-process-override');
      expect(savedConfig.instances).toBe(1);
      expect(savedConfig.exec_mode).toBe('fork');

      await processManager.deleteProcess('test-process-override');
      processManager.disconnect();
    });
  });
});
