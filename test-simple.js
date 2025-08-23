#!/usr/bin/env node

const { ProcessManager } = require('./dist');

async function testSimple() {
  console.log('🚀 Starting Process Manager test...\n');
  
  const processManager = new ProcessManager({
    maxProcesses: 3,
    autoRestart: true,
    logLevel: 'info'
  });

  try {
    // Ждем инициализации PM2
    console.log('⏳ Initializing PM2 connection...');
    await processManager.init();
    console.log('✅ PM2 connection initialized successfully!\n');

    // Создаем простой процесс
    console.log('📝 Creating process...');
    const processId = await processManager.createProcess({
      name: 'test-process',
      script: './example-script.js',
      instances: 1,
      exec_mode: 'fork',
      callbacks: {
        onStart: () => console.log('✅ Process started callback executed'),
        onStop: () => console.log('⏹️  Process stopped callback executed'),
        onRestart: () => console.log('🔄 Process restarted callback executed'),
        onDelete: () => console.log('🗑️  Process deleted callback executed')
      }
    });

    console.log(`✅ Process created with ID: ${processId}\n`);

    // Ждем немного, чтобы процесс запустился
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Получаем информацию о процессе
    console.log('📊 Getting process info...');
    const info = await processManager.getProcessInfo('test-process');
    console.log('Process info:', info);
    console.log('');

    // Получаем статус
    console.log('📈 Getting process status...');
    const status = await processManager.getProcessStatus('test-process');
    console.log('Process status:', status);
    console.log('');

    // Ждем еще немного
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Перезапускаем процесс
    console.log('🔄 Restarting process...');
    await processManager.restartProcess('test-process');
    console.log('');

    // Ждем
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Останавливаем процесс
    console.log('⏹️  Stopping process...');
    await processManager.stopProcess('test-process');
    console.log('');

    // Ждем
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Удаляем процесс
    console.log('🗑️  Deleting process...');
    await processManager.deleteProcess('test-process');
    console.log('');

    console.log('🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    // Закрываем соединение с PM2
    processManager.disconnect();
    console.log('🔌 Disconnected from PM2');
    
    // Завершаем процесс через 1 секунду
    setTimeout(() => {
      console.log('👋 Exiting...');
      process.exit(0);
    }, 1000);
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

// Запускаем тест
testSimple().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
