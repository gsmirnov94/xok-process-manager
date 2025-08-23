import request from 'supertest';
import { ProcessManager } from '../src/process-manager';
import { ProcessManagerAPI } from '../src/api-server';

describe('ProcessManagerAPI', () => {
  let apiServer: ProcessManagerAPI;
  let processManager: ProcessManager;

  beforeEach(() => {
    processManager = new ProcessManager({
      maxProcesses: 5,
      autoRestart: false,
      logLevel: 'error'
    });
    
    apiServer = new ProcessManagerAPI(processManager, 0); // Порт 0 для автоматического выбора
  });

  afterEach(() => {
    apiServer.stop();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(apiServer.getApp())
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: 'ok',
        activeProcesses: 0
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Process Management', () => {
    it('should return 404 for non-existent process', async () => {
      const response = await request(apiServer.getApp())
        .get('/processes/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return empty processes list initially', async () => {
      const response = await request(apiServer.getApp())
        .get('/processes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return 400 for invalid process creation', async () => {
      const response = await request(apiServer.getApp())
        .post('/processes')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 for process creation without script', async () => {
      const response = await request(apiServer.getApp())
        .post('/processes')
        .send({ name: 'test-process' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('script');
    });
  });

  describe('Results Management', () => {
    it('should return 404 for results of non-existent process', async () => {
      const response = await request(apiServer.getApp())
        .get('/processes/non-existent/results')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for invalid result file creation', async () => {
      const response = await request(apiServer.getApp())
        .post('/processes/test-process/results')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('Statistics', () => {
    it('should return statistics', async () => {
      const response = await request(apiServer.getApp())
        .get('/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalProcesses: 0,
        totalFiles: 0,
        totalSize: 0,
        processesWithResults: 0,
        averageFilesPerProcess: 0,
        averageFileSize: 0
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(apiServer.getApp())
        .get('/unknown-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });

    it('should handle internal server errors', async () => {
      // Создаем процесс для тестирования
      await processManager.createProcess({
        name: 'test-process',
        script: './test.js'
      });

      // Тестируем endpoint, который может вызвать ошибку
      const response = await request(apiServer.getApp())
        .post('/processes/test-process/start')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('CORS', () => {
    it('should have CORS enabled', async () => {
      const response = await request(apiServer.getApp())
        .get('/health')
        .set('Origin', 'http://localhost:3001')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Request Logging', () => {
    it('should log requests', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await request(apiServer.getApp())
        .get('/health')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/GET \/health/)
      );

      consoleSpy.mockRestore();
    });
  });
});
