import request from 'supertest';
import { ProcessManagerAPI } from '../process-manager-api';

type MockProcessManager = ReturnType<typeof createMockProcessManager>;

function createMockProcessManager() {
  return {
    init: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    getActiveProcessCount: jest.fn().mockReturnValue(2),
    createProcess: jest.fn().mockResolvedValue(1),
    getAllProcesses: jest.fn().mockResolvedValue([{ id: 1, name: 'one' }]),
    getProcessInfo: jest.fn().mockResolvedValue({ id: 1, name: 'one' }),
    startProcess: jest.fn().mockResolvedValue(undefined),
    stopProcess: jest.fn().mockResolvedValue(undefined),
    restartProcess: jest.fn().mockResolvedValue(undefined),
    deleteProcess: jest.fn().mockResolvedValue(undefined),
    getProcessStatus: jest.fn().mockResolvedValue('stopped'),
    stopAllProcesses: jest.fn().mockResolvedValue(undefined),
    restartAllProcesses: jest.fn().mockResolvedValue(undefined),
    saveResultFile: jest.fn().mockResolvedValue('/some/path/result.txt'),
    getProcessResults: jest.fn().mockResolvedValue([{ fileName: 'result.txt' }]),
    getAllProcessResults: jest.fn().mockResolvedValue([{ id: 1, results: [] }]),
    createProcessResultsZip: jest.fn().mockResolvedValue('/some/path/one.zip'),
    createAllResultsZip: jest.fn().mockResolvedValue('/some/path/all.zip'),
    deleteResultFile: jest.fn().mockResolvedValue(undefined),
    clearProcessResults: jest.fn().mockResolvedValue(undefined),
    clearAllResults: jest.fn().mockResolvedValue(undefined),
    getResultsStatistics: jest.fn().mockResolvedValue({ totalFiles: 3 }),
    getAvailableScripts: jest.fn().mockReturnValue(['example-script.js']),
    getScriptsDirectory: jest.fn().mockReturnValue('/abs/process-scripts'),
    getProcessIds: jest.fn().mockReturnValue([1, 2]),
    getProcessName: jest.fn().mockImplementation((id: number) => (id === 1 ? 'one' : undefined)),
    forceShutdown: jest.fn().mockResolvedValue(undefined),
  };
}

describe('ProcessManagerAPI', () => {
  let pm: MockProcessManager;
  let api: ProcessManagerAPI;
  let app: any;

  beforeEach(() => {
    pm = createMockProcessManager();
    api = new ProcessManagerAPI(pm as any, 0);
    app = api.getApp();
    jest.useRealTimers();
  });

  test('GET /health returns ok and activeProcesses', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.activeProcesses).toBe(2);
  });

  test('POST /init calls init and returns success', async () => {
    const res = await request(app).post('/init').expect(200);
    expect(pm.init).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  test('POST /processes validates input', async () => {
    const res = await request(app).post('/processes').send({}).expect(400);
    expect(res.body.success).toBe(false);
    expect(pm.createProcess).not.toHaveBeenCalled();
  });

  test('POST /processes passes config to createProcess', async () => {
    const res = await request(app)
      .post('/processes')
      .send({ name: 'p', script: 's.js' })
      .expect(200);
    expect(pm.createProcess).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'p', script: 's.js' })
    );
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBe(1);
  });

  test('GET /processes returns list', async () => {
    const res = await request(app).get('/processes').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([{ id: 1, name: 'one' }]);
  });

  test('GET /processes/:id validates id', async () => {
    const res = await request(app).get('/processes/abc').expect(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /processes/:id returns 404 when not found', async () => {
    pm.getProcessInfo.mockResolvedValueOnce(undefined);
    const res = await request(app).get('/processes/99').expect(404);
    expect(res.body.success).toBe(false);
  });

  test('GET /processes/:id returns info', async () => {
    const res = await request(app).get('/processes/1').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ id: 1, name: 'one' });
  });

  test('POST /processes/:id/start starts process and uses name', async () => {
    const res = await request(app).post('/processes/1/start').expect(200);
    expect(pm.startProcess).toHaveBeenCalledWith(1);
    expect(res.body.message).toContain('one');
  });

  test('POST /processes/:id/stop stops process', async () => {
    await request(app).post('/processes/1/stop').expect(200);
    expect(pm.stopProcess).toHaveBeenCalledWith(1);
  });

  test('POST /processes/:id/restart restarts process', async () => {
    await request(app).post('/processes/1/restart').expect(200);
    expect(pm.restartProcess).toHaveBeenCalledWith(1);
  });

  test('DELETE /processes/:id deletes process', async () => {
    await request(app).delete('/processes/1').expect(200);
    expect(pm.deleteProcess).toHaveBeenCalledWith(1);
  });

  test('GET /processes/:id/status returns status', async () => {
    const res = await request(app).get('/processes/1/status').expect(200);
    expect(pm.getProcessStatus).toHaveBeenCalledWith(1);
    expect(res.body.data.status).toBe('stopped');
  });

  test('POST /processes/stop-all stops all', async () => {
    await request(app).post('/processes/stop-all').expect(200);
    expect(pm.stopAllProcesses).toHaveBeenCalled();
  });

  test('POST /processes/restart-all restarts all', async () => {
    await request(app).post('/processes/restart-all').expect(200);
    expect(pm.restartAllProcesses).toHaveBeenCalled();
  });

  test('POST /processes/:id/results saves utf8 content', async () => {
    const res = await request(app)
      .post('/processes/1/results')
      .send({ fileName: 'a.txt', content: 'hello' })
      .expect(200);
    expect(pm.saveResultFile).toHaveBeenCalledWith(1, 'a.txt', 'hello');
    expect(res.body.data.filePath).toBe('/some/path/result.txt');
  });

  test('POST /processes/:id/results saves base64 content as Buffer', async () => {
    pm.saveResultFile.mockImplementationOnce(async (_id: number, _name: string, data: unknown) => {
      expect(Buffer.isBuffer(data)).toBe(true);
      return '/some/path/result.txt';
    });
    const base64 = Buffer.from('hi').toString('base64');
    await request(app)
      .post('/processes/1/results')
      .send({ fileName: 'b.bin', content: base64, encoding: 'base64' })
      .expect(200);
  });

  test('GET /processes/:id/results returns files', async () => {
    const res = await request(app).get('/processes/1/results').expect(200);
    expect(res.body.data).toEqual([{ fileName: 'result.txt' }]);
  });

  test('GET /results returns all results', async () => {
    const res = await request(app).get('/results').expect(200);
    expect(res.body.data).toEqual([{ id: 1, results: [] }]);
  });

  test('POST /processes/:id/results/zip returns zip path', async () => {
    const res = await request(app)
      .post('/processes/1/results/zip')
      .send({})
      .expect(200);
    expect(res.body.data.zipPath).toBe('/some/path/one.zip');
  });

  test('POST /results/zip returns zip path', async () => {
    const res = await request(app)
      .post('/results/zip')
      .send({})
      .expect(200);
    expect(res.body.data.zipPath).toBe('/some/path/all.zip');
  });

  test('DELETE /processes/:id/results/:fileName deletes file', async () => {
    await request(app).delete('/processes/1/results/file.txt').expect(200);
    expect(pm.deleteResultFile).toHaveBeenCalledWith(1, 'file.txt');
  });

  test('DELETE /processes/:id/results clears results', async () => {
    await request(app).delete('/processes/1/results').expect(200);
    expect(pm.clearProcessResults).toHaveBeenCalledWith(1);
  });

  test('DELETE /results clears all results', async () => {
    await request(app).delete('/results').expect(200);
    expect(pm.clearAllResults).toHaveBeenCalled();
  });

  test('GET /statistics returns stats', async () => {
    const res = await request(app).get('/statistics').expect(200);
    expect(res.body.data).toEqual({ totalFiles: 3 });
  });

  test('GET /scripts returns scripts and directory', async () => {
    const res = await request(app).get('/scripts').expect(200);
    expect(res.body.data.scripts).toEqual(['example-script.js']);
    expect(res.body.data.directory).toBe('/abs/process-scripts');
  });

  test('GET /processes/ids returns ids with names', async () => {
    const res = await request(app).get('/processes/ids').expect(200);
    expect(res.body.data).toEqual([
      { id: 1, name: 'one' },
      { id: 2, name: 'ID:2' },
    ]);
  });

  test('POST /shutdown triggers forceShutdown asynchronously', async () => {
    jest.useFakeTimers();
    const res = await request(app).post('/shutdown').expect(200);
    expect(res.body.success).toBe(true);
    jest.advanceTimersByTime(150);
    await Promise.resolve();
    expect(pm.forceShutdown).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('unknown route returns 404', async () => {
    const res = await request(app).get('/nope').expect(404);
    expect(res.body.success).toBe(false);
  });

  test('server error returns 500 with success=false', async () => {
    pm.getAllProcesses.mockRejectedValueOnce(new Error('boom'));
    const res = await request(app).get('/processes').expect(500);
    expect(res.body.success).toBe(false);
  });
});


