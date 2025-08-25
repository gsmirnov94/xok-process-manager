/*
  Tests for ProcessManager. We mock pm2 and fs to avoid real side effects.
*/

type PM2Mock = ReturnType<typeof createPM2Mock>;

function createPM2Mock() {
  const state = {
    connected: false,
    processes: new Map<string, { name: string }>(),
  };

  return {
    __state: state,
    connect: jest.fn((cb: (err?: any) => void) => {
      state.connected = true;
      cb && cb();
    }),
    disconnect: jest.fn(() => {
      state.connected = false;
    }),
    start: jest.fn((arg: any, cb: (err: any, proc?: any) => void) => {
      // Supports both start(config) and start(name)
      const name = typeof arg === 'string' ? arg : arg.name;
      state.processes.set(name, { name });
      cb(null, [{ pm2_env: { pm_id: 1 } }]);
    }),
    stop: jest.fn((name: string, cb: (err?: any) => void) => {
      cb();
    }),
    restart: jest.fn((name: string, cb: (err?: any) => void) => {
      cb();
    }),
    delete: jest.fn((name: string, cb: (err?: any) => void) => {
      state.processes.delete(name);
      cb();
    }),
    describe: jest.fn((name: string, cb: (err?: any, list?: any[]) => void) => {
      if (!state.processes.has(name)) {
        cb(null, []);
        return;
      }
      cb(null, [{
        pid: 1234,
        name,
        pm2_env: { status: 'online', pm_id: 1, pm_uptime: 111, restart_time: 0 },
        monit: { cpu: 2.5, memory: 2048 },
      }]);
    }),
    list: jest.fn((cb: (err?: any, list?: any[]) => void) => {
      const arr: any[] = [];
      for (const name of state.processes.keys()) {
        arr.push({
          pid: 111,
          name,
          pm2_env: { status: 'online', pm_id: 1, pm_uptime: 222, restart_time: 0 },
          monit: { cpu: 1.1, memory: 1024 },
        });
      }
      cb(null, arr);
    }),
  };
}

// Minimal in-memory fs mock
function createFsMock() {
  const directories = new Set<string>();
  const files = new Map<string, { content: Buffer; mtime: Date }>();

  const pathSep = '/';
  const getDir = (p: string) => p.substring(0, p.lastIndexOf(pathSep)) || '/';

  return {
    __state: { directories, files },
    existsSync: jest.fn((p: string) => directories.has(p) || files.has(p)),
    mkdirSync: jest.fn((p: string, _opts?: any) => {
      directories.add(p);
    }),
    writeFileSync: jest.fn((p: string, data: any, enc?: any) => {
      if (!directories.has(getDir(p))) directories.add(getDir(p));
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data), enc || 'utf8');
      files.set(p, { content: buf, mtime: new Date() });
    }),
    readdirSync: jest.fn((dir: string) => {
      const names = new Set<string>();
      for (const filePath of files.keys()) {
        if (filePath.startsWith(dir + pathSep)) {
          const rest = filePath.substring((dir + pathSep).length);
          const first = rest.split(pathSep)[0];
          if (first) names.add(first);
        }
      }
      return Array.from(names);
    }),
    statSync: jest.fn((p: string) => {
      if (files.has(p)) {
        const meta = files.get(p)!;
        return { isFile: () => true, size: meta.content.length, mtime: meta.mtime } as any;
      }
      return { isFile: () => false, isDirectory: () => directories.has(p) } as any;
    }),
    unlinkSync: jest.fn((p: string) => {
      if (!files.has(p)) throw new Error('ENOENT');
      files.delete(p);
    }),
    createWriteStream: jest.fn(() => ({
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    })),
  };
}

describe('ProcessManager', () => {
  let pm2Mock: PM2Mock;
  let fsMock: ReturnType<typeof createFsMock>;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    pm2Mock = createPM2Mock();
    fsMock = createFsMock();

    jest.doMock('pm2', () => pm2Mock);
    jest.doMock('fs', () => fsMock);
    // Mock archiver to avoid pulling native/glob deps
    jest.doMock('archiver', () => {
      let outputStream: any;
      let bytes = 0;
      const archiverFn = jest.fn(() => ({
        on: jest.fn(),
        pipe: jest.fn((out: any) => {
          outputStream = out;
        }),
        file: jest.fn((_path: string, opts: { name: string }) => {
          bytes += Buffer.byteLength(opts.name);
        }),
        finalize: jest.fn(() => {
          // simulate async close
          if (outputStream && outputStream.emit) {
            outputStream.emit('close');
          }
        }),
        pointer: jest.fn(() => bytes),
      }));
      return { __esModule: true, default: archiverFn };
    });
  });

  test('createProcess stores config, returns pmId and calls onStart', async () => {
    const { ProcessManager } = await import('../process-manager');
    const onStart = jest.fn();
    const manager = new ProcessManager({ defaultOutputDirectory: '/results', scriptsDirectory: '/scripts' });

    const id = await manager.createProcess({ name: 'p1', script: 's.js', callbacks: { onStart } });
    expect(id).toBe(1);
    expect(onStart).toHaveBeenCalled();
    expect(manager.getActiveProcessCount()).toBe(1);
  });

  test('start/stop/restart/delete invoke pm2 and callbacks', async () => {
    const { ProcessManager } = await import('../process-manager');
    const callbacks = { onStart: jest.fn(), onStop: jest.fn(), onRestart: jest.fn(), onDelete: jest.fn() };
    const manager = new ProcessManager();
    const id = await manager.createProcess({ name: 'p2', script: 's.js', callbacks });

    await manager.startProcess(id);
    expect(pm2Mock.start).toHaveBeenCalledWith('p2', expect.any(Function));
    expect(callbacks.onStart).toHaveBeenCalledTimes(2); // create + start

    await manager.stopProcess(id);
    expect(pm2Mock.stop).toHaveBeenCalledWith('p2', expect.any(Function));
    expect(callbacks.onStop).toHaveBeenCalled();

    await manager.restartProcess(id);
    expect(pm2Mock.restart).toHaveBeenCalledWith('p2', expect.any(Function));
    expect(callbacks.onRestart).toHaveBeenCalled();

    await manager.deleteProcess(id);
    expect(pm2Mock.delete).toHaveBeenCalledWith('p2', expect.any(Function));
    expect(callbacks.onDelete).toHaveBeenCalled();
    expect(manager.getActiveProcessCount()).toBe(0);
  });

  test('getProcessInfo and getAllProcesses map pm2 data correctly', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager();
    const id = await manager.createProcess({ name: 'p3', script: 's.js' });

    const info = await manager.getProcessInfo(id);
    expect(info).toEqual(expect.objectContaining({ name: 'p3', status: 'online', pmId: 1 }));

    const list = await manager.getAllProcesses();
    expect(list.length).toBe(1);
    expect(list[0]).toEqual(expect.objectContaining({ name: 'p3', status: 'online' }));
  });

  test('getProcessStatus returns status string', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager();
    const id = await manager.createProcess({ name: 'p4', script: 's.js' });
    await expect(manager.getProcessStatus(id)).resolves.toBe('online');
  });

  test('result files save/read/clear/delete', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager({ defaultOutputDirectory: '/results' });
    const id = await manager.createProcess({ name: 'job', script: 'job.js' });

    const savedPath = await manager.saveResultFile(id, 'a.txt', 'hello');
    expect(fsMock.writeFileSync).toHaveBeenCalled();
    expect(typeof savedPath).toBe('string');

    const files = await manager.getProcessResultFiles(id);
    expect(files.map(f => f.name)).toContain('a.txt');

    const results = await manager.getProcessResults(id);
    expect(results.fileCount).toBe(1);
    expect(results.totalSize).toBeGreaterThan(0);

    await manager.deleteResultFile(id, 'a.txt');
    await expect(manager.getProcessResultFiles(id)).resolves.toEqual([]);

    // Add again and clear
    await manager.saveResultFile(id, 'b.txt', 'x');
    await manager.clearProcessResults(id);
    await expect(manager.getProcessResultFiles(id)).resolves.toEqual([]);
  });

  test('getAvailableScripts and getScriptsDirectory work with fs', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager({ scriptsDirectory: '/scripts' });
    // simulate two script files
    (fsMock as any).mkdirSync('/scripts');
    (fsMock as any).writeFileSync('/scripts/a.js', '');
    (fsMock as any).writeFileSync('/scripts/readme.md', '');
    (fsMock as any).writeFileSync('/scripts/b.ts', '');

    const dir = manager.getScriptsDirectory();
    expect(dir).toBe('/scripts');
    const scripts = manager.getAvailableScripts();
    expect(scripts.sort()).toEqual(['a.js', 'b.ts']);
  });
});


