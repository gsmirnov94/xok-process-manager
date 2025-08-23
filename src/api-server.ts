import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as cors from 'cors';
import { ProcessManager } from './process-manager';
import { ProcessConfig, ProcessCallbacks } from './types';

export class ProcessManagerAPI {
  private app: express.Application;
  private processManager: ProcessManager;
  private port: number;

  constructor(processManager: ProcessManager, port: number = 3000) {
    this.processManager = processManager;
    this.port = port;
    this.app = (express as any)();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use((cors as any)());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Логирование запросов
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
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

        const pmId = await this.processManager.createProcess(config);
        res.json({
          success: true,
          message: `Process ${config.name} created successfully`,
          pmId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
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
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Получение информации о конкретном процессе
    this.app.get('/processes/:name', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        const processInfo = await this.processManager.getProcessInfo(name);
        
        if (!processInfo) {
          return res.status(404).json({
            success: false,
            error: `Process ${name} not found`,
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          success: true,
          data: processInfo,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Запуск процесса
    this.app.post('/processes/:name/start', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        await this.processManager.startProcess(name);
        
        res.json({
          success: true,
          message: `Process ${name} started successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Остановка процесса
    this.app.post('/processes/:name/stop', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        await this.processManager.stopProcess(name);
        
        res.json({
          success: true,
          message: `Process ${name} stopped successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Перезапуск процесса
    this.app.post('/processes/:name/restart', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        await this.processManager.restartProcess(name);
        
        res.json({
          success: true,
          message: `Process ${name} restarted successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Удаление процесса
    this.app.delete('/processes/:name', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        await this.processManager.deleteProcess(name);
        
        res.json({
          success: true,
          message: `Process ${name} deleted successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Получение статуса процесса
    this.app.get('/processes/:name/status', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        const status = await this.processManager.getProcessStatus(name);
        
        res.json({
          success: true,
          data: { name, status },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
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
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
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
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Сохранение файла результата
    this.app.post('/processes/:name/results', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
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

        const filePath = await this.processManager.saveResultFile(name, fileName, fileContent);
        
        res.json({
          success: true,
          message: `Result file saved successfully`,
          data: { fileName, filePath },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Получение файлов результатов процесса
    this.app.get('/processes/:name/results', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        const results = await this.processManager.getProcessResults(name);
        
        res.json({
          success: true,
          data: results,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
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
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Создание ZIP архива с результатами процесса
    this.app.post('/processes/:name/results/zip', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        const { outputPath, options } = req.body;
        
        const zipPath = await this.processManager.createProcessResultsZip(name, outputPath, options);
        
        res.json({
          success: true,
          message: `ZIP archive created successfully`,
          data: { zipPath },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
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
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Удаление файла результата
    this.app.delete('/processes/:name/results/:fileName', async (req: Request, res: Response) => {
      try {
        const { name, fileName } = req.params;
        await this.processManager.deleteResultFile(name, fileName);
        
        res.json({
          success: true,
          message: `Result file ${fileName} deleted successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Очистка результатов процесса
    this.app.delete('/processes/:name/results', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        await this.processManager.clearProcessResults(name);
        
        res.json({
          success: true,
          message: `All result files for process ${name} cleared successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
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
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
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
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
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
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
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
      console.error('API Error:', error);
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
      await this.processManager.init();
      
      this.app.listen(this.port, () => {
        console.log(`Process Manager API server started on port ${this.port}`);
        console.log(`Health check: http://localhost:${this.port}/health`);
        console.log(`API documentation: http://localhost:${this.port}/docs`);
      });
    } catch (error) {
      console.error('Failed to start API server:', error);
      throw error;
    }
  }

  /**
   * Останавливает HTTP сервер
   */
  stop(): void {
    this.processManager.disconnect();
    console.log('Process Manager API server stopped');
  }

  /**
   * Получает Express приложение для интеграции
   */
  getApp(): express.Application {
    return this.app;
  }
}
