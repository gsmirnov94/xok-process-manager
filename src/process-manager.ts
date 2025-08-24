// Используем require для PM2, так как TypeScript типы не соответствуют реальному API
const pm2 = require('pm2');
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { ProcessConfig, ProcessCallbacks, ProcessInfo, ProcessManagerOptions, ResultFile, ProcessResults, ZipArchiveOptions } from './types';

export class ProcessManager {
  private processes: Map<string, ProcessConfig> = new Map();
  private options: ProcessManagerOptions;
  private isConnected: boolean = false;

  constructor(options: ProcessManagerOptions = {}) {
    this.options = {
      maxProcesses: 10,
      autoRestart: true,
      logLevel: 'info',
      defaultOutputDirectory: './process-results',
      ...options
    };
    
    // Создаем директорию для результатов, если она не существует
    this.ensureOutputDirectory();
  }

  /**
   * Создает директорию для результатов процессов
   */
  private ensureOutputDirectory(): void {
    const outputDir = this.options.defaultOutputDirectory || './process-results';
    if (!fs.existsSync(outputDir)) {
      try {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Created output directory: ${outputDir}`);
      } catch (error) {
        console.error(`Error creating output directory ${outputDir}:`, error);
      }
    }
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
    let processName: string = config.name;
    
    try {
      await this.ensureConnection();

      if (this.processes.size >= (this.options.maxProcesses || 10)) {
        throw new Error(`Maximum number of processes (${this.options.maxProcesses}) reached`);
      }

      // Объединяем конфигурацию по умолчанию с переданной конфигурацией
      const mergedConfig: ProcessConfig = {
        ...(this.options.defaultProcessConfig || {}),
        ...config,
        // Глубокое объединение для вложенных объектов
        env: {
          ...(this.options.defaultProcessConfig?.env || {}),
          ...(config.env || {})
        },
        callbacks: {
          ...(this.options.defaultProcessConfig?.callbacks || {}),
          ...(config.callbacks || {})
        }
      };

      // Сохраняем объединенную конфигурацию процесса
      this.processes.set(mergedConfig.name, mergedConfig);

      processName = mergedConfig.name;

      // Создаем процесс через PM2
      return new Promise((resolve, reject) => {
        const pm2Config: any = {
          name: mergedConfig.name,
          script: mergedConfig.script,
          args: mergedConfig.args || [],
          cwd: mergedConfig.cwd || process.cwd(),
          env: mergedConfig.env || {},
          instances: mergedConfig.instances || 1,
          execMode: mergedConfig.execMode || 'fork',
          watch: mergedConfig.watch || false,
          ignoreWatch: mergedConfig.ignoreWatch || [],
          maxMemoryRestart: mergedConfig.maxMemoryRestart,
          time: mergedConfig.time || false
        };

        // Добавляем опциональные поля только если они определены
        if (mergedConfig.errorFile) pm2Config.error_file = mergedConfig.errorFile;
        if (mergedConfig.outFile) pm2Config.out_file = mergedConfig.outFile;
        if (mergedConfig.logFile) pm2Config.log_file = mergedConfig.logFile;

        pm2.start(pm2Config, (err: any, proc: any) => {
          if (err) {
            reject(err);
            return;
          }

          // Вызываем колбэк запуска
          if (mergedConfig.callbacks?.onStart) {
            try {
              mergedConfig.callbacks.onStart();
            } catch (callbackErr) {
              console.error(`Error in onStart callback for process ${mergedConfig.name}:`, callbackErr);
            }
          }

          const pmId = Array.isArray(proc) && proc.length > 0 ? proc[0].pm2_env?.pm_id : 0;
          console.log(`Process ${mergedConfig.name} created successfully with PM2 ID: ${pmId}`);
          resolve(pmId || 0);
        });
      });
    } catch (error) {
      console.error(`Error creating process ${processName}:`, error);
      console.error('Error details:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        config: config,
        options: this.options
      });
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
          pmId: (proc as any).pm2_env?.pm_id || 0
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
          pmId: (proc as any).pm2_env?.pm_id || 0
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
   * Получает директорию для результатов процесса
   */
  private getProcessOutputDirectory(processName: string): string {
    const config = this.processes.get(processName);
    const outputDir = config?.outputDirectory || this.options.defaultOutputDirectory || './process-results';
    return path.join(outputDir, processName);
  }

  /**
   * Создает директорию для результатов процесса
   */
  private ensureProcessOutputDirectory(processName: string): void {
    const processOutputDir = this.getProcessOutputDirectory(processName);
    if (!fs.existsSync(processOutputDir)) {
      try {
        fs.mkdirSync(processOutputDir, { recursive: true });
        console.log(`Created process output directory: ${processOutputDir}`);
      } catch (error) {
        console.error(`Error creating process output directory ${processOutputDir}:`, error);
      }
    }
  }

  /**
   * Сохраняет файл результата для процесса
   */
  async saveResultFile(processName: string, fileName: string, content: string | Buffer): Promise<string> {
    if (!this.processes.has(processName)) {
      throw new Error(`Process ${processName} not found`);
    }

    this.ensureProcessOutputDirectory(processName);
    const processOutputDir = this.getProcessOutputDirectory(processName);
    const filePath = path.join(processOutputDir, fileName);

    try {
      if (typeof content === 'string') {
        fs.writeFileSync(filePath, content, 'utf8');
      } else {
        fs.writeFileSync(filePath, content);
      }

      console.log(`Result file saved: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error(`Error saving result file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Получает список файлов результатов для процесса
   */
  async getProcessResultFiles(processName: string): Promise<ResultFile[]> {
    if (!this.processes.has(processName)) {
      throw new Error(`Process ${processName} not found`);
    }

    const processOutputDir = this.getProcessOutputDirectory(processName);
    
    if (!fs.existsSync(processOutputDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(processOutputDir);
      const resultFiles: ResultFile[] = [];

      for (const file of files) {
        const filePath = path.join(processOutputDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          resultFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
            processName
          });
        }
      }

      // Сортируем по времени изменения (новые сначала)
      return resultFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      console.error(`Error reading result files for process ${processName}:`, error);
      return [];
    }
  }

  /**
   * Получает информацию о результатах процесса
   */
  async getProcessResults(processName: string): Promise<ProcessResults> {
    const files = await this.getProcessResultFiles(processName);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      processName,
      files,
      totalSize,
      fileCount: files.length
    };
  }

  /**
   * Получает все результаты всех процессов
   */
  async getAllProcessResults(): Promise<ProcessResults[]> {
    const results: ProcessResults[] = [];
    
    for (const processName of this.processes.keys()) {
      try {
        const processResults = await this.getProcessResults(processName);
        results.push(processResults);
      } catch (error) {
        console.error(`Error getting results for process ${processName}:`, error);
      }
    }

    return results;
  }

  /**
   * Создает zip-архив с результатами процесса
   */
  async createProcessResultsZip(processName: string, outputPath?: string, options: ZipArchiveOptions = {}): Promise<string> {
    if (!this.processes.has(processName)) {
      throw new Error(`Process ${processName} not found`);
    }

    const processResults = await this.getProcessResults(processName);
    if (processResults.files.length === 0) {
      throw new Error(`No result files found for process ${processName}`);
    }

    const zipPath = outputPath || path.join(
      this.options.defaultOutputDirectory || './process-results',
      `${processName}-results-${Date.now()}.zip`
    );

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: options.compressionLevel || 6 }
      });

      output.on('close', () => {
        console.log(`Zip archive created: ${zipPath} (${archive.pointer()} bytes)`);
        resolve(zipPath);
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // Добавляем файлы в архив
      for (const file of processResults.files) {
        const fileName = options.includeProcessName !== false 
          ? `${processName}/${file.name}`
          : file.name;
        
        archive.file(file.path, { name: fileName });
      }

      archive.finalize();
    });
  }

  /**
   * Создает zip-архив со всеми результатами всех процессов
   */
  async createAllResultsZip(outputPath?: string, options: ZipArchiveOptions = {}): Promise<string> {
    const allResults = await this.getAllProcessResults();
    const hasResults = allResults.some(result => result.files.length > 0);
    
    if (!hasResults) {
      throw new Error('No result files found for any process');
    }

    const zipPath = outputPath || path.join(
      this.options.defaultOutputDirectory || './process-results',
      `all-processes-results-${Date.now()}.zip`
    );

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: options.compressionLevel || 6 }
      });

      output.on('close', () => {
        console.log(`All results zip archive created: ${zipPath} (${archive.pointer()} bytes)`);
        resolve(zipPath);
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // Добавляем файлы всех процессов в архив
      for (const processResult of allResults) {
        if (processResult.files.length === 0) continue;

        for (const file of processResult.files) {
          let fileName: string;
          
          if (options.flattenStructure) {
            fileName = `${processResult.processName}-${file.name}`;
          } else if (options.includeProcessName !== false) {
            fileName = `${processResult.processName}/${file.name}`;
          } else {
            fileName = file.name;
          }
          
          archive.file(file.path, { name: fileName });
        }
      }

      archive.finalize();
    });
  }

  /**
   * Удаляет файл результата
   */
  async deleteResultFile(processName: string, fileName: string): Promise<void> {
    if (!this.processes.has(processName)) {
      throw new Error(`Process ${processName} not found`);
    }

    const processOutputDir = this.getProcessOutputDirectory(processName);
    const filePath = path.join(processOutputDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Result file ${fileName} not found for process ${processName}`);
    }

    try {
      fs.unlinkSync(filePath);
      console.log(`Result file deleted: ${filePath}`);
    } catch (error) {
      console.error(`Error deleting result file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Очищает все результаты процесса
   */
  async clearProcessResults(processName: string): Promise<void> {
    if (!this.processes.has(processName)) {
      throw new Error(`Process ${processName} not found`);
    }

    const processOutputDir = this.getProcessOutputDirectory(processName);
    
    if (!fs.existsSync(processOutputDir)) {
      return;
    }

    try {
      const files = fs.readdirSync(processOutputDir);
      
      for (const file of files) {
        const filePath = path.join(processOutputDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          fs.unlinkSync(filePath);
        }
      }

      console.log(`All result files cleared for process ${processName}`);
    } catch (error) {
      console.error(`Error clearing result files for process ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Очищает все результаты всех процессов
   */
  async clearAllResults(): Promise<void> {
    for (const processName of this.processes.keys()) {
      try {
        await this.clearProcessResults(processName);
      } catch (error) {
        console.error(`Error clearing results for process ${processName}:`, error);
      }
    }
    
    console.log('All process results cleared');
  }

  /**
   * Получает статистику по результатам
   */
  async getResultsStatistics(): Promise<{
    totalProcesses: number;
    totalFiles: number;
    totalSize: number;
    processesWithResults: number;
    averageFilesPerProcess: number;
    averageFileSize: number;
  }> {
    const allResults = await this.getAllProcessResults();
    const totalProcesses = this.processes.size;
    const processesWithResults = allResults.filter(result => result.files.length > 0).length;
    const totalFiles = allResults.reduce((sum, result) => sum + result.fileCount, 0);
    const totalSize = allResults.reduce((sum, result) => sum + result.totalSize, 0);

    return {
      totalProcesses,
      totalFiles,
      totalSize,
      processesWithResults,
      averageFilesPerProcess: processesWithResults > 0 ? totalFiles / processesWithResults : 0,
      averageFileSize: totalFiles > 0 ? totalSize / totalFiles : 0
    };
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
