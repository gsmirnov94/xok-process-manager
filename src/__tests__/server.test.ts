import type { ProcessManager as PMType } from '../process-manager';
import type { ProcessManagerAPI as APIType } from '../api-server';

describe('server.ts main()', () => {
  let originalEnv: NodeJS.ProcessEnv;
  const mockAPIStart = jest.fn().mockResolvedValue(undefined);
  const mockAPIStop = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation(((code?: any) => undefined) as unknown as (code?: any) => never);

    jest.mock('../process-manager', () => {
      const PMMock = jest.fn().mockImplementation((_opts: any) => ({}) as unknown as PMType);
      return { ProcessManager: PMMock };
    });

    jest.mock('../api-server', () => {
      const APIMock = jest.fn().mockImplementation(() => ({
        start: mockAPIStart,
        stop: mockAPIStop,
      }) as unknown as APIType);
      return { ProcessManagerAPI: APIMock };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  function getMocks() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ProcessManager } = require('../process-manager');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ProcessManagerAPI } = require('../api-server');
    return { ProcessManager, ProcessManagerAPI } as {
      ProcessManager: jest.Mock;
      ProcessManagerAPI: jest.Mock;
    };
  }

  test('starts API server, constructs with defaults, registers signal handlers', async () => {
    const onSpy = jest.spyOn(process, 'on');

    const { main } = await import('../server');
    const { ProcessManager, ProcessManagerAPI } = getMocks();

    await main();

    // Assert ProcessManager constructed with defaults
    expect(ProcessManager).toHaveBeenCalledTimes(1);
    expect(ProcessManager.mock.calls[0][0]).toEqual({
      defaultOutputDirectory: './process-results',
      scriptsDirectory: './process-scripts',
    });

    // Assert API constructed and started
    expect(ProcessManagerAPI).toHaveBeenCalledTimes(1);
    const pmInstance = ProcessManager.mock.instances[0];
    expect(ProcessManagerAPI).toHaveBeenCalledWith(pmInstance, 3000);
    expect(mockAPIStart).toHaveBeenCalled();

    // Signal handlers registered
    const events = onSpy.mock.calls.map(call => call[0]);
    expect(events).toEqual(expect.arrayContaining(['SIGINT', 'SIGTERM']));

    // Invoke SIGINT handler and ensure graceful stop and exit(0)
    const sigintHandler = onSpy.mock.calls.find(call => call[0] === 'SIGINT')?.[1] as () => Promise<void>;
    expect(typeof sigintHandler).toBe('function');
    await sigintHandler();
    expect(mockAPIStop).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  test('respects SCRIPTS_DIRECTORY env var in ProcessManager options', async () => {
    process.env.SCRIPTS_DIRECTORY = '/custom/scripts';

    const { main } = await import('../server');
    const { ProcessManager } = getMocks();

    await main();

    expect(ProcessManager.mock.calls[0][0]).toEqual({
      defaultOutputDirectory: './process-results',
      scriptsDirectory: '/custom/scripts',
    });
  });

  test('exits with code 1 when API start fails', async () => {
    mockAPIStart.mockRejectedValueOnce(new Error('startup failed'));

    const { main } = await import('../server');

    await main();
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalled();
  });
});


