// Используем require для PM2, так как TypeScript типы не соответствуют реальному API
const pm2 = require('pm2');
import { ProcessConfig, ProcessCallbacks, ProcessInfo, ProcessManagerOptions } from './types';

export class ProcessManager {
  private processes: Map<string, ProcessConfig> = new Map();
  private options: ProcessManagerOptions;
  private isConnected: boolean = false;

  constructor(options: ProcessManagerOptions = {}) {
    this.options = {
      maxProcesses: 10,
      autoRestart: true,
      logLevel: 'info',
      ...options
    };
  }

  /**
   * Инициализирует соединение с PM2
   * @returns Promise, который разрешается когда соединение установлено
   */
  async init(): Promise<void> {
    await this.initializePM2();
  }

  private initializePM2(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Подключаемся к PM2
      pm2.connect((err: any) => {
        if (err) {
          console.error('Error connecting to PM2:', err);
          reject(err);
          return;
        }
        this.isConnected = true;
        console.log('Connected to PM2');
        resolve();
      });
    });
  }

  private ensureConnection(): Promise<void> {
    if (this.isConnected) {
      return Promise.resolve();
    }

    // Если еще не подключены, пытаемся подключиться заново
    return new Promise((resolve, reject) => {
      pm2.connect((err: any) => {
        if (err) {
          reject(err);
          return;
        }
        this.isConnected = true;
        resolve();
      });
    });
  }

  /**
   * Создает новый процесс с указанными колбэками
   */
  async createProcess(config: ProcessConfig): Promise<number> {
    try {
      await this.ensureConnection();

      if (this.processes.size >= (this.options.maxProcesses || 10)) {
        throw new Error(`Maximum number of processes (${this.options.maxProcesses}) reached`);
      }

      // Сохраняем конфигурацию процесса
      this.processes.set(config.name, config);

      // Создаем процесс через PM2
      return new Promise((resolve, reject) => {
        const pm2Config: any = {
          name: config.name,
          script: config.script,
          args: config.args || [],
          cwd: config.cwd || process.cwd(),
          env: config.env || {},
          instances: config.instances || 1,
          exec_mode: config.exec_mode || 'fork',
          watch: config.watch || false,
          ignore_watch: config.ignore_watch || [],
          max_memory_restart: config.max_memory_restart,
          time: config.time || false
        };

        // Добавляем опциональные поля только если они определены
        if (config.error_file) pm2Config.error_file = config.error_file;
        if (config.out_file) pm2Config.out_file = config.out_file;
        if (config.log_file) pm2Config.log_file = config.log_file;

        pm2.start(pm2Config, (err: any, proc: any) => {
          if (err) {
            reject(err);
            return;
          }

          // Вызываем колбэк запуска
          if (config.callbacks?.onStart) {
            try {
              config.callbacks.onStart();
            } catch (callbackErr) {
              console.error(`Error in onStart callback for process ${config.name}:`, callbackErr);
            }
          }

          const pmId = Array.isArray(proc) && proc.length > 0 ? proc[0].pm2_env?.pm_id : 0;
          console.log(`Process ${config.name} created successfully with PM2 ID: ${pmId}`);
          resolve(pmId || 0);
        });
      });
    } catch (error) {
      console.error(`Error creating process ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Запускает процесс по имени
   */
  async startProcess(name: string): Promise<void> {
    await this.ensureConnection();
    
    const config = this.processes.get(name);
    if (!config) {
      throw new Error(`Process ${name} not found`);
    }

    return new Promise((resolve, reject) => {
      pm2.start(name, (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Вызываем колбэк запуска
        if (config.callbacks?.onStart) {
          try {
            config.callbacks.onStart();
          } catch (callbackErr) {
            console.error(`Error in onStart callback for process ${name}:`, callbackErr);
          }
        }

        console.log(`Process ${name} started successfully`);
        resolve();
      });
    });
  }

  /**
   * Останавливает процесс по имени
   */
  async stopProcess(name: string): Promise<void> {
    await this.ensureConnection();
    
    const config = this.processes.get(name);
    if (!config) {
      throw new Error(`Process ${name} not found`);
    }

    return new Promise((resolve, reject) => {
      pm2.stop(name, (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Вызываем колбэк остановки
        if (config.callbacks?.onStop) {
          try {
            config.callbacks.onStop();
          } catch (callbackErr) {
            console.error(`Error in onStop callback for process ${name}:`, callbackErr);
          }
        }

        console.log(`Process ${name} stopped successfully`);
        resolve();
      });
    });
  }

  /**
   * Перезапускает процесс по имени
   */
  async restartProcess(name: string): Promise<void> {
    await this.ensureConnection();
    
    const config = this.processes.get(name);
    if (!config) {
      throw new Error(`Process ${name} not found`);
    }

    return new Promise((resolve, reject) => {
      pm2.restart(name, (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Вызываем колбэк перезапуска
        if (config.callbacks?.onRestart) {
          try {
            config.callbacks.onRestart();
          } catch (callbackErr) {
            console.error(`Error in onRestart callback for process ${name}:`, callbackErr);
          }
        }

        console.log(`Process ${name} restarted successfully`);
        resolve();
      });
    });
  }

  /**
   * Удаляет процесс по имени
   */
  async deleteProcess(name: string): Promise<void> {
    await this.ensureConnection();
    
    const config = this.processes.get(name);
    if (!config) {
      throw new Error(`Process ${name} not found`);
    }

    return new Promise((resolve, reject) => {
      pm2.delete(name, (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Вызываем колбэк удаления
        if (config.callbacks?.onDelete) {
          try {
            config.callbacks.onDelete();
          } catch (callbackErr) {
            console.error(`Error in onDelete callback for process ${name}:`, callbackErr);
          }
        }

        // Удаляем из локального Map
        this.processes.delete(name);
        console.log(`Process ${name} deleted successfully`);
        resolve();
      });
    });
  }

  /**
   * Получает информацию о процессе
   */
  async getProcessInfo(name: string): Promise<ProcessInfo | null> {
    await this.ensureConnection();
    
    return new Promise((resolve) => {
      pm2.describe(name, (err: any, processes: any) => {
        if (err || !processes || processes.length === 0) {
          resolve(null);
          return;
        }

        const proc = processes[0];
        resolve({
          id: proc.pid || 0,
          name: proc.name || name,
          status: proc.pm2_env?.status || 'unknown',
          cpu: proc.monit?.cpu || 0,
          memory: proc.monit?.memory || 0,
          uptime: proc.pm2_env?.pm_uptime || 0,
          restarts: proc.pm2_env?.restart_time || 0,
          pm_id: (proc as any).pm2_env?.pm_id || 0
        });
      });
    });
  }

  /**
   * Получает список всех процессов
   */
  async getAllProcesses(): Promise<ProcessInfo[]> {
    await this.ensureConnection();
    
    return new Promise((resolve) => {
      pm2.list((err: any, processes: any) => {
        if (err || !processes) {
          resolve([]);
          return;
        }

        const processList: ProcessInfo[] = processes.map((proc: any) => ({
          id: proc.pid || 0,
          name: proc.name || 'unknown',
          status: proc.pm2_env?.status || 'unknown',
          cpu: proc.monit?.cpu || 0,
          memory: proc.monit?.memory || 0,
          uptime: proc.pm2_env?.pm_uptime || 0,
          restarts: proc.pm2_env?.restart_time || 0,
          pm_id: (proc as any).pm2_env?.pm_id || 0
        }));

        resolve(processList);
      });
    });
  }

  /**
   * Получает статус процесса
   */
  async getProcessStatus(name: string): Promise<string> {
    const info = await this.getProcessInfo(name);
    return info?.status || 'not_found';
  }

  /**
   * Останавливает все процессы
   */
  async stopAllProcesses(): Promise<void> {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      pm2.stop('all', (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Вызываем колбэки остановки для всех процессов
        for (const [name, config] of this.processes) {
          if (config.callbacks?.onStop) {
            try {
              config.callbacks.onStop();
            } catch (callbackErr) {
              console.error(`Error in onStop callback for process ${name}:`, callbackErr);
            }
          }
        }

        console.log('All processes stopped successfully');
        resolve();
      });
    });
  }

  /**
   * Перезапускает все процессы
   */
  async restartAllProcesses(): Promise<void> {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      pm2.restart('all', (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Вызываем колбэки перезапуска для всех процессов
        for (const [name, config] of this.processes) {
          if (config.callbacks?.onRestart) {
            try {
              config.callbacks.onRestart();
            } catch (callbackErr) {
              console.error(`Error in onRestart callback for process ${name}:`, callbackErr);
            }
          }
        }

        console.log('All processes restarted successfully');
        resolve();
      });
    });
  }

  /**
   * Получает количество активных процессов
   */
  getActiveProcessCount(): number {
    return this.processes.size;
  }

  /**
   * Проверяет, существует ли процесс
   */
  hasProcess(name: string): boolean {
    return this.processes.has(name);
  }

  /**
   * Получает список имен всех процессов
   */
  getProcessNames(): string[] {
    return Array.from(this.processes.keys());
  }

  /**
   * Закрывает соединение с PM2
   */
  disconnect(): void {
    if (this.isConnected) {
      try {
        pm2.disconnect();
        this.isConnected = false;
        console.log('Disconnected from PM2');
      } catch (error) {
        console.error('Error disconnecting from PM2:', error);
      }
    }
  }

  /**
   * Принудительно завершает все процессы и закрывает соединение
   */
  async forceShutdown(): Promise<void> {
    try {
      // Останавливаем все процессы
      if (this.processes.size > 0) {
        console.log('Force stopping all processes...');
        await this.stopAllProcesses();
      }
      
      // Закрываем соединение
      this.disconnect();
      
      // Принудительно завершаем процесс через 2 секунды
      setTimeout(() => {
        console.log('Force exiting...');
        process.exit(0);
      }, 2000);
      
    } catch (error) {
      console.error('Error during force shutdown:', error);
      process.exit(1);
    }
  }
}
