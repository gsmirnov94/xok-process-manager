import { ProcessManagerAPI } from '../src/api-server';
import { ProcessManager } from '../src/process-manager';
import { ProcessCallbacks } from '../src/types';

// Пример использования API сервера с глобальными колбэками
async function exampleWithGlobalCallbacks() {
  // Создаем ProcessManager
  const processManager = new ProcessManager({
    maxProcesses: 5,
    autoRestart: true,
    logLevel: 'info'
  });

  // Определяем глобальные колбэки, которые будут применяться ко всем процессам
  const globalCallbacks: ProcessCallbacks = {
    onStart: async () => {
      console.log('🟢 Глобальный колбэк: Процесс запущен');
      // Здесь можно добавить логику, которая выполняется при запуске любого процесса
      // Например, отправка уведомлений, логирование в базу данных и т.д.
    },
    onStop: async () => {
      console.log('🔴 Глобальный колбэк: Процесс остановлен');
      // Логика при остановке процесса
    },
    onRestart: async () => {
      console.log('🔄 Глобальный колбэк: Процесс перезапущен');
      // Логика при перезапуске процесса
    },
    onDelete: async () => {
      console.log('🗑️ Глобальный колбэк: Процесс удален');
      // Логика при удалении процесса
    }
  };

  // Создаем API сервер с глобальными колбэками
  const apiServer = new ProcessManagerAPI(processManager, 3000, globalCallbacks);

  // Запускаем API сервер
  await apiServer.start();

  console.log('API сервер запущен с глобальными колбэками');
  console.log('Теперь все создаваемые процессы будут автоматически использовать эти колбэки');
}

// Пример с частичными колбэками
async function exampleWithPartialCallbacks() {
  const processManager = new ProcessManager();
  
  // Определяем только некоторые колбэки
  const partialCallbacks: ProcessCallbacks = {
    onStart: async () => {
      console.log('✅ Процесс запущен - глобальное уведомление');
    },
    onStop: async () => {
      console.log('⏹️ Процесс остановлен - глобальное уведомление');
    }
    // onRestart и onDelete не определены - они не будут вызываться
  };

  const apiServer = new ProcessManagerAPI(processManager, 3001, partialCallbacks);
  await apiServer.start();

  console.log('API сервер запущен с частичными колбэками');
}

// Пример без колбэков
async function exampleWithoutCallbacks() {
  const processManager = new ProcessManager();
  
  // API сервер без глобальных колбэков
  const apiServer = new ProcessManagerAPI(processManager, 3002);
  await apiServer.start();

  console.log('API сервер запущен без глобальных колбэков');
}

// Пример динамического обновления колбэков
async function exampleDynamicCallbacks() {
  const processManager = new ProcessManager();
  const apiServer = new ProcessManagerAPI(processManager, 3003);

  await apiServer.start();

  console.log('API сервер запущен без глобальных колбэков');
  console.log('Глобальные колбэки устанавливаются только в конструкторе');
}

// Запуск примеров
if (require.main === module) {
  (async () => {
    try {
      console.log('=== Пример с полными глобальными колбэками ===');
      await exampleWithGlobalCallbacks();
      
      console.log('\n=== Пример с частичными колбэками ===');
      await exampleWithPartialCallbacks();
      
      console.log('\n=== Пример без колбэков ===');
      await exampleWithoutCallbacks();
      
      console.log('\n=== Пример динамического обновления колбэков ===');
      await exampleDynamicCallbacks();
      
    } catch (error) {
      console.error('Ошибка в примерах:', error);
    }
  })();
}

export {
  exampleWithGlobalCallbacks,
  exampleWithPartialCallbacks,
  exampleWithoutCallbacks,
  exampleDynamicCallbacks
};
