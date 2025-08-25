/*
  Tests for ProcessManager. We mock pm2 and fs to avoid real side effects.
*/

type PM2Mock = ReturnType<typeof createPM2Mock>;

function createPM2Mock() {
  const state = {
    connected: false,
    processes: new Map<string, { name: string }>(),
    nextId: 1,
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
      cb(null, [{ pm2_env: { pm_id: state.nextId++ } }]);
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
    createWriteStream: jest.fn(() => {
      const handlers: Record<string, Array<() => void>> = {};
      return {
        on: jest.fn((evt: string, cb: () => void) => {
          handlers[evt] = handlers[evt] || [];
          handlers[evt].push(cb);
        }),
        once: jest.fn((evt: string, cb: () => void) => {
          handlers[evt] = handlers[evt] || [];
          const wrapper = () => {
            cb();
            handlers[evt] = (handlers[evt] || []).filter(fn => fn !== wrapper);
          };
          handlers[evt].push(wrapper);
        }),
        emit: jest.fn((evt: string) => {
          (handlers[evt] || []).forEach(fn => fn());
        }),
        write: jest.fn(),
        end: jest.fn(),
      };
    }),
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

  test('validation errors in createProcess and save/delete file paths', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager();

    // invalid name
    await expect(manager.createProcess({ name: '../bad', script: 's.js' } as any)).rejects.toThrow();
    // invalid script path
    await expect(manager.createProcess({ name: 'ok', script: '/abs.js' } as any)).rejects.toThrow();
    await expect(manager.createProcess({ name: 'ok', script: '../rel.js' } as any)).rejects.toThrow();
    // invalid cwd
    await expect(manager.createProcess({ name: 'ok', script: 's.js', cwd: '../x' } as any)).rejects.toThrow();
    // invalid outputDirectory
    await expect(manager.createProcess({ name: 'ok', script: 's.js', outputDirectory: '../out' } as any)).rejects.toThrow();
    // invalid env
    await expect(manager.createProcess({ name: 'ok', script: 's.js', env: { 'A/..': '1' } as any })).rejects.toThrow();
    await expect(manager.createProcess({ name: 'ok', script: 's.js', env: { A: 'v/..' } as any })).rejects.toThrow();

    // valid process to test file name validation and non-existing deletion
    const okId = await manager.createProcess({ name: 'val', script: 's.js' });
    await expect(manager.saveResultFile(okId, 'a/../b.txt', 'x')).rejects.toThrow();
    await expect(manager.deleteResultFile(okId, 'nope.txt')).rejects.toThrow();
  });

  test('createProcess handles pm2.start error with logging', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager();

    // First ensure connection
    (pm2Mock.connect as any).mockImplementationOnce((cb: any) => { pm2Mock.__state.connected = true; cb(); });
    // Force start error
    (pm2Mock.start as any).mockImplementationOnce((_cfg: any, cb: any) => cb(new Error('start fail')));
    await expect(manager.createProcess({ name: 'err', script: 's.js' })).rejects.toThrow('start fail');
  });

  test('init() handles PM2 connect error', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager();
    (pm2Mock.connect as any).mockImplementationOnce((cb: any) => cb(new Error('connect fail')));
    await expect(manager.init()).rejects.toThrow('connect fail');
  });

  test('getProcessInfo null when unknown, and when pm2.describe errors', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager();
    const id = await manager.createProcess({ name: 'p5', script: 's.js' });

    // Unknown id
    await expect(manager.getProcessInfo(999)).resolves.toBeNull();
    // describe error
    (pm2Mock.describe as any).mockImplementationOnce((_n: string, cb: any) => cb(new Error('desc fail')));
    await expect(manager.getProcessInfo(id)).resolves.toBeNull();
  });

  test('getAllProcesses returns [] on pm2.list error', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager();
    (pm2Mock.list as any).mockImplementationOnce((cb: any) => cb(new Error('list fail')));
    await expect(manager.getAllProcesses()).resolves.toEqual([]);
  });

  test('stopAllProcesses and restartAllProcesses call callbacks for each', async () => {
    const { ProcessManager } = await import('../process-manager');
    const cb1 = { onStop: jest.fn(), onRestart: jest.fn() };
    const cb2 = { onStop: jest.fn(), onRestart: jest.fn() };
    const manager = new ProcessManager();
    const a = await manager.createProcess({ name: 'a', script: 's.js', callbacks: cb1 });
    const b = await manager.createProcess({ name: 'b', script: 's.js', callbacks: cb2 });

    await manager.stopAllProcesses();
    expect(cb1.onStop).toHaveBeenCalled();
    expect(cb2.onStop).toHaveBeenCalled();

    await manager.restartAllProcesses();
    expect(cb1.onRestart).toHaveBeenCalled();
    expect(cb2.onRestart).toHaveBeenCalled();
  });

  test('getAllProcessResults continues on per-process error', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager();
    const id1 = await manager.createProcess({ name: 'r1', script: 's.js' });
    const id2 = await manager.createProcess({ name: 'r2', script: 's.js' });

    const spy = jest.spyOn(manager as any, 'getProcessResults');
    spy.mockImplementationOnce(async () => { throw new Error('boom'); });
    spy.mockImplementationOnce(async () => ({ processName: 'r2', files: [], totalSize: 0, fileCount: 0 }));

    const results = await manager.getAllProcessResults();
    expect(results).toEqual([{ processName: 'r2', files: [], totalSize: 0, fileCount: 0 }]);
  });

  test('createProcessResultsZip errors when no files; succeeds when files exist', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager({ defaultOutputDirectory: '/out' });
    const id = await manager.createProcess({ name: 'zipper', script: 's.js' });

    // error when no files
    await expect(manager.createProcessResultsZip(id)).rejects.toThrow('No result files');

    // add file and succeed
    await manager.saveResultFile(id, 'one.txt', 'data');
    const zipPath = await manager.createProcessResultsZip(id, undefined, { compressionLevel: 9 });
    expect(zipPath).toMatch(/zipper-results/);
  });

  test('createAllResultsZip errors when none; succeeds with options', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager({ defaultOutputDirectory: '/out' });
    const id = await manager.createProcess({ name: 'pall', script: 's.js' });
    await expect(manager.createAllResultsZip()).rejects.toThrow('No result files');

    await manager.saveResultFile(id, 'a.txt', 'x');
    const path1 = await manager.createAllResultsZip(undefined, { flattenStructure: true });
    expect(path1).toMatch(/all-processes-results/);
  });

  test('hasProcess, getProcessIds, getProcessName, getResultsStatistics', async () => {
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager({ defaultOutputDirectory: '/out' });
    const id1 = await manager.createProcess({ name: 's1', script: 's.js' });
    const id2 = await manager.createProcess({ name: 's2', script: 's.js' });
    expect(manager.hasProcess(id1)).toBe(true);
    expect(manager.getProcessIds().sort()).toEqual([id1, id2].sort());
    expect(manager.getProcessName(id2)).toBe('s2');

    await manager.saveResultFile(id1, 'f1.txt', 'x');
    const stats = await manager.getResultsStatistics();
    expect(stats.totalProcesses).toBe(2);
    expect(stats.totalFiles).toBeGreaterThanOrEqual(1);
  });

  test('disconnect only when connected; forceShutdown paths with timers', async () => {
    jest.useFakeTimers();
    const { ProcessManager } = await import('../process-manager');
    const manager = new ProcessManager();
    // not connected yet
    manager.disconnect();

    // create to have processes, then shutdown triggers stopAll + exit(0)
    await manager.createProcess({ name: 'qq', script: 's.js' });
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    await manager.forceShutdown();
    jest.advanceTimersByTime(2100);
    expect(exitSpy).toHaveBeenCalledWith(0);
    jest.useRealTimers();
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


