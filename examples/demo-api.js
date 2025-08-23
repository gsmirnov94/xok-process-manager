#!/usr/bin/env node

/**
 * Демонстрационный скрипт для Process Manager HTTP API
 * 
 * Запуск:
 * 1. Сначала запустите API сервер: npm run start:api
 * 2. Затем запустите этот скрипт: node examples/demo-api.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(50)}`);
  console.log(`${colors.bright}${title}`);
  console.log(`${'='.repeat(50)}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function demoAPI() {
  try {
    logSection('Process Manager HTTP API Demo');
    logInfo('Убедитесь, что API сервер запущен на http://localhost:3000');
    
    // 1. Проверка здоровья сервера
    logSection('1. Health Check');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`);
      logSuccess(`Сервер работает: ${healthResponse.data.status}`);
      logInfo(`Активных процессов: ${healthResponse.data.activeProcesses}`);
    } catch (error) {
      logError('Не удалось подключиться к API серверу');
      logInfo('Запустите сервер командой: npm run start:api');
      return;
    }

    // 2. Инициализация PM2
    logSection('2. PM2 Initialization');
    try {
      const initResponse = await axios.post(`${API_BASE_URL}/init`);
      logSuccess(initResponse.data.message);
    } catch (error) {
      logWarning('PM2 уже инициализирован или произошла ошибка');
    }

    // 3. Создание процесса
    logSection('3. Process Creation');
    const processConfig = {
      name: 'demo-process',
      script: './example-script.js',
      args: ['--demo', '--env', 'development'],
      env: {
        NODE_ENV: 'development',
        DEMO_MODE: 'true',
        PROCESS_ID: 'demo-001'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      outputDirectory: './demo-results'
    };

    try {
      const createResponse = await axios.post(`${API_BASE_URL}/processes`, processConfig);
      logSuccess(`Процесс создан: ${createResponse.data.message}`);
      logInfo(`PM2 ID: ${createResponse.data.pmId}`);
    } catch (error) {
      logError(`Ошибка создания процесса: ${error.response?.data?.error || error.message}`);
    }

    // 4. Получение списка процессов
    logSection('4. Process List');
    try {
      const processesResponse = await axios.get(`${API_BASE_URL}/processes`);
      logSuccess(`Найдено процессов: ${processesResponse.data.count}`);
      
      if (processesResponse.data.data.length > 0) {
        processesResponse.data.data.forEach(process => {
          logInfo(`- ${process.name}: ${process.status} (PID: ${process.id})`);
        });
      }
    } catch (error) {
      logError(`Ошибка получения списка процессов: ${error.response?.data?.error || error.message}`);
    }

    // 5. Получение информации о процессе
    logSection('5. Process Information');
    try {
      const processInfoResponse = await axios.get(`${API_BASE_URL}/processes/demo-process`);
      const processInfo = processInfoResponse.data.data;
      logSuccess(`Информация о процессе ${processInfo.name}:`);
      logInfo(`  Статус: ${processInfo.status}`);
      logInfo(`  PID: ${processInfo.id}`);
      logInfo(`  CPU: ${processInfo.cpu}%`);
      logInfo(`  Память: ${Math.round(processInfo.memory / 1024 / 1024)} MB`);
      logInfo(`  Время работы: ${Math.round(processInfo.uptime / 1000)} сек`);
    } catch (error) {
      logError(`Ошибка получения информации о процессе: ${error.response?.data?.error || error.message}`);
    }

    // 6. Запуск процесса
    logSection('6. Process Start');
    try {
      const startResponse = await axios.post(`${API_BASE_URL}/processes/demo-process/start`);
      logSuccess(startResponse.data.message);
      
      // Ждем немного для запуска
      logInfo('Ожидание запуска процесса...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Проверяем статус
      const statusResponse = await axios.get(`${API_BASE_URL}/processes/demo-process/status`);
      logInfo(`Статус после запуска: ${statusResponse.data.data.status}`);
    } catch (error) {
      logError(`Ошибка запуска процесса: ${error.response?.data?.error || error.message}`);
    }

    // 7. Сохранение файла результата
    logSection('7. Result File Management');
    try {
      const resultContent = `Демонстрационный результат
Время создания: ${new Date().toISOString()}
Процесс: demo-process
Статус: completed
`;

      const saveResponse = await axios.post(`${API_BASE_URL}/processes/demo-process/results`, {
        fileName: 'demo-result.txt',
        content: resultContent,
        encoding: 'utf8'
      });
      logSuccess('Файл результата сохранен');
      logInfo(`Путь: ${saveResponse.data.data.filePath}`);

      // Сохраняем еще один файл
      const jsonResult = {
        timestamp: new Date().toISOString(),
        processName: 'demo-process',
        status: 'running',
        metrics: {
          cpu: 2.5,
          memory: 52428800,
          uptime: 5000
        }
      };

      await axios.post(`${API_BASE_URL}/processes/demo-process/results`, {
        fileName: 'metrics.json',
        content: JSON.stringify(jsonResult, null, 2),
        encoding: 'utf8'
      });
      logSuccess('Файл метрик сохранен');

    } catch (error) {
      logError(`Ошибка сохранения файла результата: ${error.response?.data?.error || error.message}`);
    }

    // 8. Получение результатов
    logSection('8. Process Results');
    try {
      const resultsResponse = await axios.get(`${API_BASE_URL}/processes/demo-process/results`);
      const results = resultsResponse.data.data;
      logSuccess(`Результаты процесса ${results.processName}:`);
      logInfo(`  Файлов: ${results.fileCount}`);
      logInfo(`  Общий размер: ${Math.round(results.totalSize / 1024)} KB`);
      
      results.files.forEach(file => {
        logInfo(`  - ${file.name}: ${Math.round(file.size / 1024)} KB (${file.modified})`);
      });
    } catch (error) {
      logError(`Ошибка получения результатов: ${error.response?.data?.error || error.message}`);
    }

    // 9. Создание ZIP архива
    logSection('9. ZIP Archive Creation');
    try {
      const zipResponse = await axios.post(`${API_BASE_URL}/processes/demo-process/results/zip`, {
        options: {
          compressionLevel: 6,
          includeProcessName: true,
          flattenStructure: false
        }
      });
      logSuccess('ZIP архив создан');
      logInfo(`Путь: ${zipResponse.data.data.zipPath}`);
    } catch (error) {
      logError(`Ошибка создания ZIP архива: ${error.response?.data?.error || error.message}`);
    }

    // 10. Статистика
    logSection('10. Statistics');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/statistics`);
      const stats = statsResponse.data.data;
      logSuccess('Статистика системы:');
      logInfo(`  Всего процессов: ${stats.totalProcesses}`);
      logInfo(`  Процессов с результатами: ${stats.processesWithResults}`);
      logInfo(`  Всего файлов: ${stats.totalFiles}`);
      logInfo(`  Общий размер: ${Math.round(stats.totalSize / 1024)} KB`);
      logInfo(`  Среднее количество файлов на процесс: ${stats.averageFilesPerProcess.toFixed(2)}`);
      logInfo(`  Средний размер файла: ${Math.round(stats.averageFileSize / 1024)} KB`);
    } catch (error) {
      logError(`Ошибка получения статистики: ${error.response?.data?.error || error.message}`);
    }

    // 11. Остановка процесса
    logSection('11. Process Stop');
    try {
      const stopResponse = await axios.post(`${API_BASE_URL}/processes/demo-process/stop`);
      logSuccess(stopResponse.data.message);
      
      // Проверяем статус
      const statusResponse = await axios.get(`${API_BASE_URL}/processes/demo-process/status`);
      logInfo(`Статус после остановки: ${statusResponse.data.data.status}`);
    } catch (error) {
      logError(`Ошибка остановки процесса: ${error.response?.data?.error || error.message}`);
    }

    // 12. Удаление процесса
    logSection('12. Process Deletion');
    try {
      const deleteResponse = await axios.delete(`${API_BASE_URL}/processes/demo-process`);
      logSuccess(deleteResponse.data.message);
    } catch (error) {
      logError(`Ошибка удаления процесса: ${error.response?.data?.error || error.message}`);
    }

    // 13. Очистка результатов
    logSection('13. Results Cleanup');
    try {
      const clearResponse = await axios.delete(`${API_BASE_URL}/processes/demo-process/results`);
      logSuccess(clearResponse.data.message);
    } catch (error) {
      logError(`Ошибка очистки результатов: ${error.response?.data?.error || error.message}`);
    }

    logSection('Demo Completed');
    logSuccess('Демонстрация HTTP API завершена успешно!');
    logInfo('Все операции выполнены через REST endpoints');
    logInfo('API сервер продолжает работать на http://localhost:3000');

  } catch (error) {
    logError(`Критическая ошибка в демо: ${error.message}`);
    if (error.response) {
      logError(`HTTP ${error.response.status}: ${error.response.data?.error || 'Unknown error'}`);
    }
  }
}

// Запуск демо
if (require.main === module) {
  demoAPI().catch(console.error);
}

module.exports = { demoAPI };
