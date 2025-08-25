import express, { Request, Response, Router } from 'express';
import { ProcessManager } from './process-manager';
import { ProcessConfig, ProcessInfo } from './types';

export class ProcessManagerAPI {
  private app: express.Application;
  private router: Router;
  private processManager: ProcessManager;

  constructor(port: number = 3000) {
    this.app = express();
    this.router = Router();
    this.processManager = new ProcessManager();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.startServer(port);
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use('/api', this.router);
  }

  private setupRoutes(): void {
    // Create a new process
    this.router.post('/processes', async (req: Request, res: Response) => {
      try {
        const config: ProcessConfig = req.body;
        
        if (!config.script) {
          return res.status(400).json({ 
            error: 'Script path is required' 
          });
        }

        await this.processManager.createProcess(config);
        res.status(204).json();
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to create process',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Get all processes
    this.router.get('/processes', async (req: Request, res: Response) => {
      try {
        const processes = await this.processManager.getProcessList();
        res.json({ 
          processes,
          count: processes.length
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to get process list',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Get specific process by name or ID
    this.router.get('/processes/:identifier', async (req: Request, res: Response) => {
      try {
        const { identifier } = req.params;
        const process = await this.processManager.getProcess(identifier);
        
        if (!process) {
          return res.status(404).json({ 
            error: 'Process not found',
            identifier 
          });
        }

        // If identifier is a number (ID), return single process
        // If identifier is a string (name), return array of processes
        if (Array.isArray(process)) {
          res.json({ 
            processes: process,
            count: process.length,
            name: identifier
          });
        } else {
          res.json({ process });
        }
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to get process',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Stop a process
    this.router.delete('/processes/:identifier', async (req: Request, res: Response) => {
      try {
        const { identifier } = req.params;
        await this.processManager.stopProcess(identifier);
        
        res.json({ 
          message: 'Process stopped successfully',
          identifier 
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to stop process',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Process Manager API'
      });
    });

    // Error handling middleware
    this.router.use((err: Error, req: Request, res: Response, next: Function) => {
      console.error('API Error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        details: err.message 
      });
    });
  }

  private startServer(port: number): void {
    this.app.listen(port, () => {
      console.log(`Process Manager API server running on port ${port}`);
      console.log(`API endpoints available at http://localhost:${port}/api`);
    });
  }

  /**
   * Get the Express app instance
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get the router instance
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Stop the API server and cleanup
   */
  async shutdown(): Promise<void> {
    try {
      this.processManager.disconnect();
      console.log('Process Manager API shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}
