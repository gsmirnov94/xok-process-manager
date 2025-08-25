// Используем require для PM2, так как TypeScript типы не соответствуют реальному API
const pm2 = require('pm2');
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { ProcessConfig, ProcessCallbacks, ProcessInfo, ProcessManagerOptions, ResultFile, ProcessResults, ZipArchiveOptions } from './types';

export class ProcessManager {
  private processes: Map<number, ProcessConfig> = new Map();
  private options: ProcessManagerOptions;
  private isConnected: boolean = false;

  constructor(options: ProcessManagerOptions = {}) {
    this.options = {
      defaultOutputDirectory: './process-results',
      ...options
    };
    
    // Создаем директории, если они не существуют
    this.ensureOutputDirectory();
    this.ensureScriptsDirectory();
  }

  /**
   * Валидирует имя процесса на предмет безопасности
   */
  private validateProcessName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Process name must be a non-empty string');
    }

    // Проверяем на path traversal
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      throw new Error('Process name contains invalid characters');
    }

    // Проверяем на null bytes и control characters
    if (name.includes('\x00') || /[\x00-\x1F\x7F]/.test(name)) {
      throw new Error('Process name contains invalid control characters');
    }

    // Проверяем длину
    if (name.length > 255) {
      throw new Error('Process name is too long');
    }

    // Проверяем на unicode control characters
    if (/[\u0000-\u001F\u007F-\u009F]/.test(name)) {
      throw new Error('Process name contains unicode control characters');
    }
  }

  /**
   * Валидирует путь к скрипту на предмет безопасности
   */
  private validateScriptPath(scriptPath: string): void {
    if (!scriptPath || typeof scriptPath !== 'string') {
      throw new Error('Script path must be a non-empty string');
    }

    // Проверяем на path traversal (..)
    if (scriptPath.includes('..')) {
      throw new Error('Script path contains path traversal attempt');
    }

    // Проверяем на абсолютные пути
    if (path.isAbsolute(scriptPath)) {
      throw new Error('Script path cannot be absolute');
    }

    // Проверяем на null bytes и control characters
    if (scriptPath.includes('\x00') || /[\x00-\x1F\x7F]/.test(scriptPath)) {
      throw new Error('Script path contains invalid control characters');
    }

    // Проверяем длину
    if (scriptPath.length > 1024) {
      throw new Error('Script path is too long');
    }

    // Проверяем на unicode control characters
    if (/[\u0000-\u001F\u007F-\u009F]/.test(scriptPath)) {
      throw new Error('Script path contains unicode control characters');
    }
  }

  /**
   * Валидирует рабочую директорию на предмет безопасности
   */
  private validateWorkingDirectory(cwd: string): void {
    if (!cwd || typeof cwd !== 'string') {
      throw new Error('Working directory must be a non-empty string');
    }

    // Проверяем на path traversal (только ..)
    if (cwd.includes('..')) {
      throw new Error('Working directory contains path traversal attempt');
    }

    // Проверяем на null bytes и control characters
    if (cwd.includes('\x00') || /[\x00-\x1F\x7F]/.test(cwd)) {
      throw new Error('Working directory contains invalid control characters');
    }

    // Проверяем длину
    if (cwd.length > 1024) {
      throw new Error('Working directory path is too long');
    }

    // Проверяем на unicode control characters
    if (/[\u0000-\u001F\u007F-\u009F]/.test(cwd)) {
      throw new Error('Working directory contains unicode control characters');
    }
  }

  /**
   * Валидирует выходную директорию на предмет безопасности
   */
  private validateOutputDirectory(outputDir: string): void {
    if (!outputDir || typeof outputDir !== 'string') {
      throw new Error('Output directory must be a non-empty string');
    }

    // Проверяем на path traversal (только ..)
    if (outputDir.includes('..')) {
      throw new Error('Output directory contains path traversal attempt');
    }

    // Проверяем на null bytes и control characters
    if (outputDir.includes('\x00') || /[\x00-\x1F\x7F]/.test(outputDir)) {
      throw new Error('Output directory contains invalid control characters');
    }

    // Проверяем длину
    if (outputDir.length > 1024) {
      throw new Error('Output directory path is too long');
    }

    // Проверяем на unicode control characters
    if (/[\u0000-\u001F\u007F-\u009F]/.test(outputDir)) {
      throw new Error('Output directory contains unicode control characters');
    }
  }

  /**
   * Валидирует переменные окружения на предмет безопасности
   */
  private validateEnvironmentVariables(env: Record<string, string> | undefined): void {
    if (!env) {
      return;
    }

    for (const [key, value] of Object.entries(env)) {
      // Проверяем ключ на path traversal
      if (key.includes('..') || key.includes('/') || key.includes('\\')) {
        throw new Error('Environment variable key contains invalid characters');
      }

      // Проверяем значение на path traversal
      if (value.includes('..') || value.includes('/') || value.includes('\\')) {
        throw new Error('Environment variable value contains path traversal attempt');
      }

      // Проверяем на null bytes и control characters
      if (key.includes('\x00') || /[\x00-\x1F\x7F]/.test(key) || 
          value.includes('\x00') || /[\x00-\x1F\x7F]/.test(value)) {
        throw new Error('Environment variable contains invalid control characters');
      }

      // Проверяем длину
      if (key.length > 255 || value.length > 1024) {
        throw new Error('Environment variable key or value is too long');
      }
    }
  }

  /**
   * Валидирует имя файла на предмет безопасности
   */
  private validateFileName(fileName: string): void {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('File name must be a non-empty string');
    }

    // Проверяем на path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error('File name contains invalid characters');
    }

    // Проверяем на null bytes и control characters
    if (fileName.includes('\x00') || /[\x00-\x1F\x7F]/.test(fileName)) {
      throw new Error('File name contains invalid control characters');
    }

    // Проверяем длину
    if (fileName.length > 255) {
      throw new Error('File name is too long');
    }

    // Проверяем на unicode control characters
    if (/[\u0000-\u001F\u007F-\u009F]/.test(fileName)) {
      throw new Error('File name contains unicode control characters');
    }
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
   * Проверяет и создает директорию для скриптов процессов
   */
  private ensureScriptsDirectory(): void {
    const scriptsDir = this.options.scriptsDirectory || './process-scripts';
    if (!fs.existsSync(scriptsDir)) {
      try {
        fs.mkdirSync(scriptsDir, { recursive: true });
        console.log(`Created scripts directory: ${scriptsDir}`);
      } catch (error) {
        console.error(`Error creating scripts directory ${scriptsDir}:`, error);
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
    try {
      // Валидируем входные данные
      this.validateProcessName(config.name);
      this.validateScriptPath(config.script);
      if (config.cwd) {
        this.validateWorkingDirectory(config.cwd);
      }
      if (config.outputDirectory) {
        this.validateOutputDirectory(config.outputDirectory);
      }
      if (config.env) {
        this.validateEnvironmentVariables(config.env);
      }

      await this.ensureConnection();
      
      return new Promise((resolve, reject) => {
        const pm2Config: any = {
          name: config.name,
          script: config.script,
          args: config.args || [],
          cwd: config.cwd || process.cwd(),
          env: config.env || {},
          instances: config.instances || 1,
          execMode: config.execMode || 'fork',
          watch: config.watch || false,
          ignoreWatch: config.ignoreWatch || [],
          maxMemoryRestart: config.maxMemoryRestart,
          time: config.time || false
        };

        // Добавляем опциональные поля только если они определены
        if (config.errorFile) pm2Config.error_file = config.errorFile;
        if (config.outFile) pm2Config.out_file = config.outFile;
        if (config.logFile) pm2Config.log_file = config.logFile;

        pm2.start(pm2Config, (err: any, proc: any) => {
          if (err) {
            reject(err);
            return;
          }

          const pmId = Array.isArray(proc) && proc.length > 0 ? proc[0].pm2_env?.pm_id : 0;
          
          if (pmId) {
            // Сохраняем процесс по ID
            this.processes.set(pmId, config);
            
            // Вызываем колбэк запуска
            if (config.callbacks?.onStart) {
              try {
                config.callbacks.onStart();
              } catch (callbackErr) {
                console.error(`Error in onStart callback for process ${config.name}:`, callbackErr);
              }
            }

            console.log(`Process ${config.name} created successfully with PM2 ID: ${pmId}`);
            resolve(pmId);
          } else {
            reject(new Error('Failed to get PM2 ID for created process'));
          }
        });
      });
    } catch (error) {
      console.error(`Error creating process:`, error);
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
   * Запускает процесс по ID
   */
  async startProcess(pmId: number): Promise<void> {
    await this.ensureConnection();
    
    const config = this.processes.get(pmId);
    if (!config) {
      throw new Error(`Process with ID ${pmId} not found`);
    }

    return new Promise((resolve, reject) => {
      pm2.start(config.name, (err: any) => {
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

        console.log(`Process ${config.name} started successfully`);
        resolve();
      });
    });
  }

  /**
   * Останавливает процесс по ID
   */
  async stopProcess(pmId: number): Promise<void> {
    await this.ensureConnection();
    
    const config = this.processes.get(pmId);
    if (!config) {
      throw new Error(`Process with ID ${pmId} not found`);
    }

    return new Promise((resolve, reject) => {
      pm2.stop(config.name, (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Вызываем колбэк остановки
        if (config.callbacks?.onStop) {
          try {
            config.callbacks.onStop();
          } catch (callbackErr) {
            console.error(`Error in onStop callback for process ${config.name}:`, callbackErr);
          }
        }

        console.log(`Process ${config.name} stopped successfully`);
        resolve();
      });
    });
  }

  /**
   * Перезапускает процесс по ID
   */
  async restartProcess(pmId: number): Promise<void> {
    await this.ensureConnection();
    
    const config = this.processes.get(pmId);
    if (!config) {
      throw new Error(`Process with ID ${pmId} not found`);
    }

    return new Promise((resolve, reject) => {
      pm2.restart(config.name, (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Вызываем колбэк перезапуска
        if (config.callbacks?.onRestart) {
          try {
            config.callbacks.onRestart();
          } catch (callbackErr) {
            console.error(`Error in onRestart callback for process ${config.name}:`, callbackErr);
          }
        }

        console.log(`Process ${config.name} restarted successfully`);
        resolve();
      });
    });
  }

  /**
   * Удаляет процесс по ID
   */
  async deleteProcess(pmId: number): Promise<void> {
    await this.ensureConnection();
    
    const config = this.processes.get(pmId);
    if (!config) {
      throw new Error(`Process with ID ${pmId} not found`);
    }

    return new Promise((resolve, reject) => {
      pm2.delete(config.name, (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Вызываем колбэк удаления
        if (config.callbacks?.onDelete) {
          try {
            config.callbacks.onDelete();
          } catch (callbackErr) {
            console.error(`Error in onDelete callback for process ${config.name}:`, callbackErr);
          }
        }

        // Удаляем из локального Map
        this.processes.delete(pmId);
        console.log(`Process ${config.name} deleted successfully`);
        resolve();
      });
    });
  }

  /**
   * Получает информацию о процессе по ID
   */
  async getProcessInfo(pmId: number): Promise<ProcessInfo | null> {
    await this.ensureConnection();
    
    const config = this.processes.get(pmId);
    if (!config) {
      return null;
    }

    return new Promise((resolve) => {
      pm2.describe(config.name, (err: any, processes: any) => {
        if (err || !processes || processes.length === 0) {
          resolve(null);
          return;
        }

        const proc = processes[0];
        resolve({
          id: proc.pid || 0,
          name: proc.name || config.name,
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
   * Получает статус процесса по ID
   */
  async getProcessStatus(pmId: number): Promise<string> {
    const info = await this.getProcessInfo(pmId);
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
        for (const [pmId, config] of this.processes) {
          if (config.callbacks?.onStop) {
            try {
              config.callbacks.onStop();
            } catch (callbackErr) {
              console.error(`Error in onStop callback for process ${config.name}:`, callbackErr);
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
        for (const [pmId, config] of this.processes) {
          if (config.callbacks?.onRestart) {
            try {
              config.callbacks.onRestart();
            } catch (callbackErr) {
              console.error(`Error in onRestart callback for process ${config.name}:`, callbackErr);
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
   * Проверяет, существует ли процесс по ID
   */
  hasProcess(pmId: number): boolean {
    return this.processes.has(pmId);
  }

  /**
   * Получает список ID всех процессов
   */
  getProcessIds(): number[] {
    return Array.from(this.processes.keys());
  }

  /**
   * Получает имя процесса по ID
   */
  getProcessName(pmId: number): string | undefined {
    const config = this.processes.get(pmId);
    return config?.name;
  }

  /**
   * Получает директорию для результатов процесса по ID
   */
  private getProcessOutputDirectory(pmId: number): string {
    const config = this.processes.get(pmId);
    if (!config) {
      throw new Error(`Process with ID ${pmId} not found`);
    }
    
    const outputDir = config.outputDirectory || this.options.defaultOutputDirectory || './process-results';
    return path.join(outputDir, config.name);
  }

  /**
   * Создает директорию для результатов процесса по ID
   */
  private ensureProcessOutputDirectory(pmId: number): void {
    const processOutputDir = this.getProcessOutputDirectory(pmId);
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
   * Сохраняет файл результата для процесса по ID
   */
  async saveResultFile(pmId: number, fileName: string, content: string | Buffer): Promise<string> {
    if (!this.processes.has(pmId)) {
      throw new Error(`Process with ID ${pmId} not found`);
    }

    // Валидируем имя файла
    this.validateFileName(fileName);

    this.ensureProcessOutputDirectory(pmId);
    const processOutputDir = this.getProcessOutputDirectory(pmId);
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
   * Получает список файлов результатов для процесса по ID
   */
  async getProcessResultFiles(pmId: number): Promise<ResultFile[]> {
    if (!this.processes.has(pmId)) {
      throw new Error(`Process with ID ${pmId} not found`);
    }

    const config = this.processes.get(pmId);
    if (!config) {
      throw new Error(`Process config not found for ID ${pmId}`);
    }

    const processOutputDir = this.getProcessOutputDirectory(pmId);
    
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
            processName: config.name
          });
        }
      }

      // Сортируем по времени изменения (новые сначала)
      return resultFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      console.error(`Error reading result files for process ${config.name}:`, error);
      return [];
    }
  }

  /**
   * Получает информацию о результатах процесса по ID
   */
  async getProcessResults(pmId: number): Promise<ProcessResults> {
    const config = this.processes.get(pmId);
    if (!config) {
      throw new Error(`Process with ID ${pmId} not found`);
    }

    const files = await this.getProcessResultFiles(pmId);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      processName: config.name,
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
    
    for (const pmId of this.processes.keys()) {
      try {
        const processResults = await this.getProcessResults(pmId);
        results.push(processResults);
      } catch (error) {
        const config = this.processes.get(pmId);
        const processName = config?.name || `ID:${pmId}`;
        console.error(`Error getting results for process ${processName}:`, error);
      }
    }

    return results;
  }

  /**
   * Создает zip-архив с результатами процесса по ID
   */
  async createProcessResultsZip(pmId: number, outputPath?: string, options: ZipArchiveOptions = {}): Promise<string> {
    if (!this.processes.has(pmId)) {
      throw new Error(`Process with ID ${pmId} not found`);
    }

    const config = this.processes.get(pmId);
    if (!config) {
      throw new Error(`Process config not found for ID ${pmId}`);
    }

    const processResults = await this.getProcessResults(pmId);
    if (processResults.files.length === 0) {
      throw new Error(`No result files found for process ${config.name}`);
    }

    const zipPath = outputPath || path.join(
      this.options.defaultOutputDirectory || './process-results',
      `${config.name}-results-${Date.now()}.zip`
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
          ? `${config.name}/${file.name}`
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
   * Удаляет файл результата по ID процесса
   */
  async deleteResultFile(pmId: number, fileName: string): Promise<void> {
    if (!this.processes.has(pmId)) {
      throw new Error(`Process with ID ${pmId} not found`);
    }

    // Валидируем имя файла на предмет безопасности
    this.validateFileName(fileName);

    const processOutputDir = this.getProcessOutputDirectory(pmId);
    const filePath = path.join(processOutputDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Result file ${fileName} not found for process with ID ${pmId}`);
    }

    try {
      fs.unlinkSync(filePath);
      console.log(`Result file deleted: ${fileName}`);
    } catch (error) {
      console.error(`Error deleting result file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Очищает все результаты процесса по ID
   */
  async clearProcessResults(pmId: number): Promise<void> {
    if (!this.processes.has(pmId)) {
      throw new Error(`Process with ID ${pmId} not found`);
    }

    const processOutputDir = this.getProcessOutputDirectory(pmId);
    
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

      const config = this.processes.get(pmId);
      const processName = config?.name || `ID:${pmId}`;
      console.log(`All result files cleared for process ${processName}`);
    } catch (error) {
      const config = this.processes.get(pmId);
      const processName = config?.name || `ID:${pmId}`;
      console.error(`Error clearing result files for process ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Очищает все результаты всех процессов
   */
  async clearAllResults(): Promise<void> {
    for (const pmId of this.processes.keys()) {
      try {
        await this.clearProcessResults(pmId);
      } catch (error) {
        const config = this.processes.get(pmId);
        const processName = config?.name || `ID:${pmId}`;
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
   * Получает список доступных скриптов процессов в директории скриптов
   */
  getAvailableScripts(): string[] {
    try {
      const scriptsDir = this.options.scriptsDirectory || './process-scripts';
      if (!fs.existsSync(scriptsDir)) {
        return [];
      }

      const files = fs.readdirSync(scriptsDir);
      return files.filter(file => {
        const filePath = path.join(scriptsDir, file);
        const stats = fs.statSync(filePath);
        return stats.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.py') || file.endsWith('.sh'));
      });
    } catch (error) {
      console.error('Error reading scripts directory:', error);
      return [];
    }
  }

  /**
   * Получает путь к директории скриптов процессов
   */
  getScriptsDirectory(): string {
    return this.options.scriptsDirectory || './process-scripts';
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
