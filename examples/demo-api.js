#!/usr/bin/env node

/**
 * Демонстрационный скрипт для Process Manager HTTP API
 * 
 * Запуск:
 * 1. Сначала запустите API сервер: npm run start:api
 * 2. Затем запустите этот скрипт: node examples/demo-api.js
 */

const { ProcessManagerAPI } = require('../src/api-server');
const { ProcessManager } = require('../src/process-manager');

// Демонстрация использования API сервера с глобальными колбэками
async function demo() {
  console.log('🚀 Запуск демонстрации API сервера с глобальными колбэками\n');

  // Создаем ProcessManager
  const processManager = new ProcessManager({
    maxProcesses: 3,
    autoRestart: true,
    logLevel: 'info'
  });

  // Определяем глобальные колбэки
  const globalCallbacks = {
    onStart: () => {
      console.log('🟢 [ГЛОБАЛЬНЫЙ] Процесс запущен!');
    },
    onStop: () => {
      console.log('🔴 [ГЛОБАЛЬНЫЙ] Процесс остановлен!');
    },
    onRestart: () => {
      console.log('🔄 [ГЛОБАЛЬНЫЙ] Процесс перезапущен!');
    },
    onDelete: () => {
      console.log('🗑️ [ГЛОБАЛЬНЫЙ] Процесс удален!');
    }
  };

  // Создаем API сервер с глобальными колбэками
  const apiServer = new ProcessManagerAPI(processManager, 3000, globalCallbacks);

  try {
    // Запускаем API сервер
    await apiServer.start();
    
    console.log('✅ API сервер успешно запущен на порту 3000');
    console.log('📋 Глобальные колбэки настроены:');
    console.log('   - onStart: уведомление о запуске');
    console.log('   - onStop: уведомление об остановке');
    console.log('   - onRestart: уведомление о перезапуске');
    console.log('   - onDelete: уведомление об удалении');
    console.log('\n🌐 Теперь можно отправлять HTTP запросы:');
    console.log('   - POST /processes - создание процесса (автоматически применит глобальные колбэки)');
    console.log('\n💡 Все создаваемые процессы будут автоматически использовать эти колбэки!');

  } catch (error) {
    console.error('❌ Ошибка запуска API сервера:', error.message);
  }
}

// Запускаем демонстрацию
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { demo };
