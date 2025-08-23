import { ProcessManager, ProcessConfig } from '../src';

/**
 * Продвинутый пример использования ProcessManager
 */
async function advancedExample() {
  console.log('🚀 Advanced Process Manager Example\n');

  const processManager = new ProcessManager({
    maxProcesses: 5,
    autoRestart: true,
    logLevel: 'debug'
  });

  try {
    // Создаем несколько процессов с разными конфигурациями
    const processes: ProcessConfig[] = [
      {
        name: 'web-server',
        script: './examples/web-server.js',
        instances: 2,
        exec_mode: 'cluster',
        env: { NODE_ENV: 'production', PORT: '3000' },
        max_memory_restart: '100M',
        watch: true,
        callbacks: {
          onStart: () => console.log('🌐 Web server started'),
          onStop: () => console.log('🌐 Web server stopped'),
          onRestart: () => console.log('🌐 Web server restarted'),
          onDelete: () => console.log('🌐 Web server deleted')
        }
      },
      {
        name: 'worker',
        script: './examples/worker.js',
        instances: 3,
        exec_mode: 'cluster',
        env: { NODE_ENV: 'production', WORKER_TYPE: 'data-processor' },
        max_memory_restart: '200M',
        callbacks: {
          onStart: () => console.log('⚙️  Worker started'),
          onStop: () => console.log('⚙️  Worker stopped'),
          onRestart: () => console.log('⚙️  Worker restarted'),
          onDelete: () => console.log('⚙️  Worker deleted')
        }
      },
      {
        name: 'monitor',
        script: './examples/monitor.js',
        instances: 1,
        exec_mode: 'fork',
        env: { NODE_ENV: 'production', MONITOR_INTERVAL: '5000' },
        callbacks: {
          onStart: () => console.log('📊 Monitor started'),
          onStop: () => console.log('📊 Monitor stopped'),
          onRestart: () => console.log('📊 Monitor restarted'),
          onDelete: () => console.log('📊 Monitor deleted')
        }
      }
    ];

    // Создаем все процессы
    console.log('📝 Creating processes...\n');
    for (const config of processes) {
      const processId = await processManager.createProcess(config);
      console.log(`✅ Created ${config.name} with ID: ${processId}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза между созданием
    }

    console.log('\n📊 All processes created successfully!\n');

    // Ждем немного для стабилизации
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Получаем информацию о всех процессах
    console.log('📈 Getting all processes info...');
    const allProcesses = await processManager.getAllProcesses();
    console.table(allProcesses);
    console.log('');

    // Мониторинг процессов в реальном времени
    console.log('🔍 Starting real-time monitoring...\n');
    const monitorInterval = setInterval(async () => {
      const processes = await processManager.getAllProcesses();
      const statusSummary = processes.map(p => `${p.name}: ${p.status}`).join(' | ');
      console.log(`📊 Status: ${statusSummary}`);
      
      // Проверяем, есть ли остановленные процессы
      const stoppedProcesses = processes.filter(p => p.status === 'stopped');
      if (stoppedProcesses.length > 0) {
        console.log(`⚠️  Found stopped processes: ${stoppedProcesses.map(p => p.name).join(', ')}`);
      }
    }, 2000);

    // Ждем 15 секунд для демонстрации мониторинга
    await new Promise(resolve => setTimeout(resolve, 15000));
    clearInterval(monitorInterval);

    // Демонстрируем управление процессами
    console.log('\n🎮 Demonstrating process management...\n');

    // Перезапускаем web-server
    console.log('🔄 Restarting web-server...');
    await processManager.restartProcess('web-server');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Останавливаем worker
    console.log('⏹️  Stopping worker...');
    await processManager.stopProcess('worker');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Запускаем worker снова
    console.log('▶️  Starting worker again...');
    await processManager.startProcess('worker');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Получаем финальную статистику
    console.log('\n📊 Final process statistics:');
    const finalProcesses = await processManager.getAllProcesses();
    console.table(finalProcesses);

    console.log('\n🎉 Advanced example completed successfully!');

  } catch (error) {
    console.error('❌ Error during advanced example:', error);
  } finally {
    // Очищаем все процессы
    console.log('\n🧹 Cleaning up processes...');
    const processNames = processManager.getProcessNames();
    
    for (const name of processNames) {
      try {
        await processManager.deleteProcess(name);
        console.log(`✅ Deleted process: ${name}`);
      } catch (error) {
        console.error(`❌ Error deleting process ${name}:`, error);
      }
    }

    // Закрываем соединение
    processManager.disconnect();
    console.log('🔌 Disconnected from PM2');
    
    // Завершаем процесс
    setTimeout(() => {
      console.log('👋 Exiting...');
      process.exit(0);
    }, 2000);
  }
}

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Запускаем пример
advancedExample().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
