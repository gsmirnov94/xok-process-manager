import { ProcessManager } from './process-manager';
import { ProcessManagerAPI } from './api-server';

async function main() {
  try {
    // Получаем путь к директории скриптов из переменной окружения или используем значение по умолчанию
    const scriptsDirectory = process.env.SCRIPTS_DIRECTORY || './scripts';
    
    // Создаем экземпляр ProcessManager с настройками
    const processManager = new ProcessManager({
      maxProcesses: 20,
      autoRestart: true,
      logLevel: 'info',
      defaultOutputDirectory: './process-results',
      scriptsDirectory
    });

    // Создаем API сервер
    const apiServer = new ProcessManagerAPI(processManager, 3000);

    // Запускаем сервер
    await apiServer.start();

    console.log('\n=== Process Manager API Server ===');
    console.log('Server is running on http://localhost:3000');
    console.log('\nAvailable endpoints:');
    console.log('GET  /health                    - Health check');
    console.log('POST /init                      - Initialize PM2');
    console.log('POST /processes                 - Create new process');
    console.log('GET  /processes                 - List all processes');
    console.log('GET  /processes/:name           - Get process info');
    console.log('POST /processes/:name/start     - Start process');
    console.log('POST /processes/:name/stop      - Stop process');
    console.log('POST /processes/:name/restart   - Restart process');
    console.log('DELETE /processes/:name         - Delete process');
    console.log('GET  /processes/:name/status    - Get process status');
    console.log('POST /processes/stop-all        - Stop all processes');
    console.log('POST /processes/restart-all     - Restart all processes');
    console.log('POST /processes/:name/results   - Save result file');
    console.log('GET  /processes/:name/results   - Get process results');
    console.log('GET  /results                   - Get all results');
    console.log('GET  /scripts                   - Get available scripts');
    console.log('POST /processes/:name/results/zip - Create process results ZIP');
    console.log('POST /results/zip               - Create all results ZIP');
    console.log('DELETE /processes/:name/results/:fileName - Delete result file');
    console.log('DELETE /processes/:name/results - Clear process results');
    console.log('DELETE /results                 - Clear all results');
    console.log('GET  /statistics                - Get results statistics');
    console.log('POST /shutdown                  - Force shutdown');
    console.log('\nPress Ctrl+C to stop the server');

    // Обработка сигналов завершения
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, shutting down gracefully...');
      apiServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down gracefully...');
      apiServer.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Запускаем сервер только если файл запущен напрямую
if (require.main === module) {
  main().catch(console.error);
}

export { main };
