export { ProcessManager } from './process-manager';
export { ProcessManagerAPI } from './api-server';
export { main as startAPIServer } from './server';
export * from './types';

// Пример использования
async function example() {
  const { ProcessManager } = await import('./process-manager');
  
  const processManager = new ProcessManager({
    maxProcesses: 5,
    autoRestart: true,
    logLevel: 'info'
  });

  try {
    // Ждем инициализации PM2
    console.log('Initializing PM2 connection...');
    await processManager.init();
    console.log('PM2 connection initialized successfully!\n');

    // Создаем процесс с колбэками
    const processId = await processManager.createProcess({
      name: 'example-process',
      script: './example-script.js',
      instances: 1,
      exec_mode: 'fork',
      callbacks: {
        onStart: () => {
          console.log('Process started - executing onStart callback');
        },
        onStop: () => {
          console.log('Process stopped - executing onStop callback');
        },
        onRestart: () => {
          console.log('Process restarted - executing onRestart callback');
        },
        onDelete: () => {
          console.log('Process deleted - executing onDelete callback');
        }
      }
    });

    console.log(`Created process with ID: ${processId}`);

    // Получаем информацию о процессе
    const info = await processManager.getProcessInfo('example-process');
    console.log('Process info:', info);

    // Получаем статус
    const status = await processManager.getProcessStatus('example-process');
    console.log('Process status:', status);

    // Перезапускаем процесс
    await processManager.restartProcess('example-process');

    // Останавливаем процесс
    await processManager.stopProcess('example-process');

    // Удаляем процесс
    await processManager.deleteProcess('example-process');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Закрываем соединение с PM2
    processManager.disconnect();
  }
}

// Запускаем пример, если файл запущен напрямую
if (require.main === module) {
  example().catch(console.error);
}
