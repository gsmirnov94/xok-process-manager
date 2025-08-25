import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as cors from 'cors';
import { ProcessManager } from './process-manager';
import { ProcessConfig, ProcessCallbacks } from './types';

export class ProcessManagerAPI {
  private app: express.Application;
  private processManager: ProcessManager;
  private port: number;
  private globalCallbacks: ProcessCallbacks;

  constructor(processManager: ProcessManager, port: number = 3000, globalCallbacks?: ProcessCallbacks) {
    this.processManager = processManager;
    this.port = port;
    this.globalCallbacks = globalCallbacks || {};
    this.app = express.default();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Логирует ошибку с детальной информацией
   */
  private logError(context: string, error: unknown, req?: Request): void {
    console.error(`[ERROR] ${context}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      request: req ? {
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        params: req.params
      } : undefined,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Отправляет ошибку клиенту с логированием
   */
  private sendError(res: Response, context: string, error: unknown, req?: Request, statusCode: number = 500): void {
    this.logError(context, error, req);
    
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }

  private setupMiddleware(): void {
    this.app.use(cors.default());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Логирование запросов и ответов
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = Math.random().toString(36).substring(7);
      
      // Логируем входящий запрос
      console.log(`[${requestId}] ${new Date().toISOString()} - ${req.method} ${req.path} - Started`);
      console.log(`[${requestId}] Request Headers:`, JSON.stringify(req.headers, null, 2));
      if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[${requestId}] Request Body:`, JSON.stringify(req.body, null, 2));
      }
      if (req.query && Object.keys(req.query).length > 0) {
        console.log(`[${requestId}] Query Params:`, JSON.stringify(req.query, null, 2));
      }
      if (req.params && Object.keys(req.params).length > 0) {
        console.log(`[${requestId}] Route Params:`, JSON.stringify(req.params, null, 2));
      }

      // Перехватываем отправку ответа для логирования
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;

      let responseBody: any;
      let statusCode: number = 200;

      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      res.json = function(body: any) {
        responseBody = body;
        return originalJson.call(this, body);
      };

      res.send = function(body: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };

      // Логируем ответ после завершения
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = statusCode >= 400 ? 'ERROR' : statusCode >= 300 ? 'WARN' : 'INFO';
        
        console.log(`[${requestId}] ${new Date().toISOString()} - ${req.method} ${req.path} - ${statusCode} - ${duration}ms - ${logLevel}`);
        
        if (responseBody) {
          // Ограничиваем размер лога ответа
          const responseStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
          if (responseStr.length > 1000) {
            console.log(`[${requestId}] Response Body (truncated):`, responseStr.substring(0, 1000) + '...');
          } else {
            console.log(`[${requestId}] Response Body:`, responseStr);
          }
        }
        
        console.log(`[${requestId}] ${req.method} ${req.path} - Completed`);
      });

      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        activeProcesses: this.processManager.getActiveProcessCount()
      });
    });

    // Инициализация PM2
    this.app.post('/init', async (req: Request, res: Response) => {
      try {
        await this.processManager.init();
        res.json({ 
          success: true, 
          message: 'PM2 initialized successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Initializing PM2', error, req);
      }
    });

    // Создание процесса
    this.app.post('/processes', async (req: Request, res: Response) => {
      try {
        const config: ProcessConfig = req.body;
        
        if (!config.name || !config.script) {
          return res.status(400).json({
            success: false,
            error: 'Process name and script are required',
            timestamp: new Date().toISOString()
          });
        }

        // Применяем глобальные колбэки из конструктора API сервера
        if (this.globalCallbacks && Object.keys(this.globalCallbacks).length > 0) {
          config.callbacks = { ...this.globalCallbacks };
        }

        const id = await this.processManager.createProcess(config);
        res.json({
          success: true,
          message: `Process ${config.name} created successfully`,
          id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Creating process', error, req);
      }
    });

    // Получение списка всех процессов
    this.app.get('/processes', async (req: Request, res: Response) => {
      try {
        const processes = await this.processManager.getAllProcesses();
        res.json({
          success: true,
          data: processes,
          count: processes.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Getting all processes', error, req);
      }
    });

    // Получение информации о конкретном процессе по ID
    this.app.get('/processes/:id', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        const processInfo = await this.processManager.getProcessInfo(id);
        
        if (!processInfo) {
          return res.status(404).json({
            success: false,
            error: `Process with ID ${id} not found`,
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          success: true,
          data: processInfo,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Getting process info', error, req);
      }
    });

    // Запуск процесса по ID
    this.app.post('/processes/:id/start', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        await this.processManager.startProcess(id);
        
        const processName = this.processManager.getProcessName(id) || `ID:${id}`;
        res.json({
          success: true,
          message: `Process ${processName} started successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Starting process', error, req);
      }
    });

    // Остановка процесса по ID
    this.app.post('/processes/:id/stop', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        await this.processManager.stopProcess(id);
        
        const processName = this.processManager.getProcessName(id) || `ID:${id}`;
        res.json({
          success: true,
          message: `Process ${processName} stopped successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Stopping process', error, req);
      }
    });

    // Перезапуск процесса по ID
    this.app.post('/processes/:id/restart', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        await this.processManager.restartProcess(id);
        
        const processName = this.processManager.getProcessName(id) || `ID:${id}`;
        res.json({
          success: true,
          message: `Process ${processName} restarted successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Restarting process', error, req);
      }
    });

    // Удаление процесса по ID
    this.app.delete('/processes/:id', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        const processName = this.processManager.getProcessName(id) || `ID:${id}`;
        await this.processManager.deleteProcess(id);
        
        res.json({
          success: true,
          message: `Process ${processName} deleted successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Deleting process', error, req);
      }
    });

    // Получение статуса процесса по ID
    this.app.get('/processes/:id/status', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        const status = await this.processManager.getProcessStatus(id);
        const processName = this.processManager.getProcessName(id) || `ID:${id}`;
        
        res.json({
          success: true,
          data: { id, name: processName, status },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Getting process status', error, req);
      }
    });

    // Остановка всех процессов
    this.app.post('/processes/stop-all', async (req: Request, res: Response) => {
      try {
        await this.processManager.stopAllProcesses();
        
        res.json({
          success: true,
          message: 'All processes stopped successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Stopping all processes', error, req);
      }
    });

    // Перезапуск всех процессов
    this.app.post('/processes/restart-all', async (req: Request, res: Response) => {
      try {
        await this.processManager.restartAllProcesses();
        
        res.json({
          success: true,
          message: 'All processes restarted successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Restarting all processes', error, req);
      }
    });

    // Сохранение файла результата по ID процесса
    this.app.post('/processes/:id/results', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        const { fileName, content, encoding = 'utf8' } = req.body;
        
        if (!fileName || content === undefined) {
          return res.status(400).json({
            success: false,
            error: 'fileName and content are required',
            timestamp: new Date().toISOString()
          });
        }

        let fileContent: string | Buffer;
        if (encoding === 'base64') {
          fileContent = Buffer.from(content, 'base64');
        } else {
          fileContent = content;
        }

        const filePath = await this.processManager.saveResultFile(id, fileName, fileContent);
        
        res.json({
          success: true,
          message: `Result file saved successfully`,
          data: { fileName, filePath },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Saving result file', error, req);
      }
    });

    // Получение файлов результатов процесса по ID
    this.app.get('/processes/:id/results', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        const results = await this.processManager.getProcessResults(id);
        
        res.json({
          success: true,
          data: results,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Getting process results', error, req);
      }
    });

    // Получение всех результатов
    this.app.get('/results', async (req: Request, res: Response) => {
      try {
        const results = await this.processManager.getAllProcessResults();
        
        res.json({
          success: true,
          data: results,
          count: results.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Getting all process results', error, req);
      }
    });

    // Создание ZIP архива с результатами процесса по ID
    this.app.post('/processes/:id/results/zip', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        const { outputPath, options } = req.body;
        
        const zipPath = await this.processManager.createProcessResultsZip(id, outputPath, options);
        
        res.json({
          success: true,
          message: `ZIP archive created successfully`,
          data: { zipPath },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Creating process results ZIP', error, req);
      }
    });

    // Создание ZIP архива со всеми результатами
    this.app.post('/results/zip', async (req: Request, res: Response) => {
      try {
        const { outputPath, options } = req.body;
        
        const zipPath = await this.processManager.createAllResultsZip(outputPath, options);
        
        res.json({
          success: true,
          message: `ZIP archive with all results created successfully`,
          data: { zipPath },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Creating all results ZIP', error, req);
      }
    });

    // Удаление файла результата по ID процесса
    this.app.delete('/processes/:id/results/:fileName', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        const { fileName } = req.params;
        await this.processManager.deleteResultFile(id, fileName);
        
        res.json({
          success: true,
          message: `Result file ${fileName} deleted successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Deleting result file', error, req);
      }
    });

    // Очистка результатов процесса по ID
    this.app.delete('/processes/:id/results', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid process ID',
            timestamp: new Date().toISOString()
          });
        }

        const processName = this.processManager.getProcessName(id) || `ID:${id}`;
        await this.processManager.clearProcessResults(id);
        
        res.json({
          success: true,
          message: `All result files for process ${processName} cleared successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Clearing process results', error, req);
      }
    });

    // Очистка всех результатов
    this.app.delete('/results', async (req: Request, res: Response) => {
      try {
        await this.processManager.clearAllResults();
        
        res.json({
          success: true,
          message: 'All result files cleared successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Clearing all results', error, req);
      }
    });

    // Получение статистики
    this.app.get('/statistics', async (req: Request, res: Response) => {
      try {
        const stats = await this.processManager.getResultsStatistics();
        
        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Getting statistics', error, req);
      }
    });

    // Получение списка доступных скриптов
    this.app.get('/scripts', async (req: Request, res: Response) => {
      try {
        const scripts = this.processManager.getAvailableScripts();
        res.json({
          success: true,
          data: {
            scripts,
            count: scripts.length,
            directory: this.processManager.getScriptsDirectory?.() || './scripts'
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Getting available scripts', error, req);
      }
    });

    // Получение списка ID всех процессов
    this.app.get('/processes/ids', async (req: Request, res: Response) => {
      try {
        const processIds = this.processManager.getProcessIds();
        const processesWithNames = processIds.map(id => ({
          id,
          name: this.processManager.getProcessName(id) || `ID:${id}`
        }));
        
        res.json({
          success: true,
          data: processesWithNames,
          count: processesWithNames.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.sendError(res, 'Getting process IDs', error, req);
      }
    });

    // Принудительное завершение
    this.app.post('/shutdown', async (req: Request, res: Response) => {
      try {
        res.json({
          success: true,
          message: 'Shutdown initiated',
          timestamp: new Date().toISOString()
        });
        
        // Запускаем shutdown в фоне
        setTimeout(async () => {
          await this.processManager.forceShutdown();
        }, 100);
        
      } catch (error) {
        this.sendError(res, 'Shutdown', error, req);
      }
    });

    // Обработка 404
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        timestamp: new Date().toISOString()
      });
    });

    // Обработка ошибок
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      const requestId = Math.random().toString(36).substring(7);
      console.error(`[${requestId}] API Error in ${req.method} ${req.path}:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Запускает HTTP сервер
   */
  async start(): Promise<void> {
    try {
      console.log(`[SERVER] Starting Process Manager API server on port ${this.port}...`);
      await this.processManager.init();
      
      this.app.listen(this.port, () => {
        console.log(`[SERVER] ✅ Process Manager API server started successfully on port ${this.port}`);
        console.log(`[SERVER] Health check: http://localhost:${this.port}/health`);
        console.log(`[SERVER] API documentation: http://localhost:${this.port}/docs`);
        console.log(`[SERVER] Server ready to accept requests`);
      });
    } catch (error) {
      console.error('[SERVER] ❌ Failed to start API server:', error);
      throw error;
    }
  }

  /**
   * Останавливает HTTP сервер
   */
  stop(): void {
    console.log('[SERVER] Stopping Process Manager API server...');
    this.processManager.disconnect();
    console.log('[SERVER] ✅ Process Manager API server stopped successfully');
  }

  /**
   * Получает Express приложение для интеграции
   */
  getApp(): express.Application {
    return this.app;
  }


}
