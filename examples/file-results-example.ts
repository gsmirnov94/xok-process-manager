import { ProcessManager } from '../src/process-manager';
import * as fs from 'fs';
import * as path from 'path';

async function fileResultsExample() {
  console.log('=== Пример работы с файлами результатов процессов ===\n');

  // Создаем менеджер процессов с настройками для работы с файлами
  const processManager = new ProcessManager({
    defaultOutputDirectory: './example-results'
  });

  try {
    // Инициализируем менеджер
    await processManager.init();
    console.log('✓ Менеджер процессов инициализирован\n');

    // Создаем тестовый процесс
    const processName = 'test-process';
    const pmId = await processManager.createProcess({
      name: processName,
      script: 'example-script.js',
      outputDirectoryPath: './example-results/test-process'
    });

    console.log(`✓ Процесс "${processName}" создан с PM2 ID: ${pmId}\n`);

    // Симулируем создание файлов результатов
    console.log('Создаем тестовые файлы результатов...');
    
    // Создаем несколько файлов результатов
    const testFiles = [
      { name: 'result-1.txt', content: 'Результат выполнения задачи 1\nДата: ' + new Date().toISOString() },
      { name: 'result-2.txt', content: 'Результат выполнения задачи 2\nДата: ' + new Date().toISOString() },
      { name: 'data.json', content: JSON.stringify({ task: 'test', status: 'completed', timestamp: Date.now() }, null, 2) },
      { name: 'log.txt', content: 'Лог выполнения процесса\n' + new Date().toISOString() + '\nУспешно завершено' }
    ];

    for (const file of testFiles) {
      await processManager.saveResultFile(processName, file.name, file.content);
    }

    console.log('✓ Тестовые файлы созданы\n');

    // Получаем информацию о результатах процесса
    console.log('Получаем информацию о результатах процесса...');
    const processResults = await processManager.getProcessResults(processName);
    
    console.log(`Процесс: ${processResults.processName}`);
    console.log(`Количество файлов: ${processResults.fileCount}`);
    console.log(`Общий размер: ${(processResults.totalSize / 1024).toFixed(2)} KB`);
    console.log('Файлы:');
    processResults.files.forEach(file => {
      console.log(`  - ${file.name} (${(file.size / 1024).toFixed(2)} KB, изменен: ${file.modified.toLocaleString()})`);
    });
    console.log('');

    // Создаем zip-архив с результатами процесса
    console.log('Создаем zip-архив с результатами процесса...');
    const processZipPath = await processManager.createProcessResultsZip(processName, undefined, {
      includeProcessName: true,
      compressionLevel: 6
    });
    console.log(`✓ Zip-архив создан: ${processZipPath}\n`);

    // Создаем еще один процесс для демонстрации
    const processName2 = 'another-process';
    await processManager.createProcess({
      name: processName2,
      script: 'another-script.js',
      outputDirectoryPath: './example-results/another-process'
    });

    console.log(`✓ Процесс "${processName2}" создан\n`);

    // Создаем файлы для второго процесса
    await processManager.saveResultFile(processName2, 'output.txt', 'Вывод второго процесса\n' + new Date().toISOString());
    await processManager.saveResultFile(processName2, 'report.csv', 'id,name,value\n1,item1,100\n2,item2,200');

    console.log('✓ Файлы для второго процесса созданы\n');

    // Получаем статистику по всем результатам
    console.log('Получаем общую статистику...');
    const statistics = await processManager.getResultsStatistics();
    
    console.log('Общая статистика:');
    console.log(`  Всего процессов: ${statistics.totalProcesses}`);
    console.log(`  Процессов с результатами: ${statistics.processesWithResults}`);
    console.log(`  Всего файлов: ${statistics.totalFiles}`);
    console.log(`  Общий размер: ${(statistics.totalSize / 1024).toFixed(2)} KB`);
    console.log(`  Среднее количество файлов на процесс: ${statistics.averageFilesPerProcess.toFixed(1)}`);
    console.log(`  Средний размер файла: ${(statistics.averageFileSize / 1024).toFixed(2)} KB`);
    console.log('');

    // Создаем общий zip-архив со всеми результатами
    console.log('Создаем общий zip-архив со всеми результатами...');
    const allResultsZipPath = await processManager.createAllResultsZip(undefined, {
      includeProcessName: true,
      flattenStructure: false,
      compressionLevel: 8
    });
    console.log(`✓ Общий zip-архив создан: ${allResultsZipPath}\n`);

    // Демонстрируем получение файлов результатов
    console.log('Получаем список файлов результатов для первого процесса...');
    const resultFiles = await processManager.getProcessResultFiles(processName);
    console.log(`Найдено файлов: ${resultFiles.length}`);
    resultFiles.forEach(file => {
      console.log(`  - ${file.name} (${file.path})`);
    });
    console.log('');

    // Демонстрируем удаление файла результата
    console.log('Удаляем файл result-1.txt...');
    await processManager.deleteResultFile(processName, 'result-1.txt');
    console.log('✓ Файл удален\n');

    // Проверяем, что файл действительно удален
    const updatedResults = await processManager.getProcessResults(processName);
    console.log(`Обновленное количество файлов: ${updatedResults.fileCount}`);

    // Очищаем результаты второго процесса
    console.log('\nОчищаем результаты второго процесса...');
    await processManager.clearProcessResults(processName2);
    console.log('✓ Результаты второго процесса очищены');

    // Получаем финальную статистику
    const finalStatistics = await processManager.getResultsStatistics();
    console.log(`Финальное количество файлов: ${finalStatistics.totalFiles}`);

  } catch (error) {
    console.error('Ошибка в примере:', error);
  } finally {
    // Очищаем все результаты
    console.log('\nОчищаем все результаты...');
    await processManager.clearAllResults();
    
    // Закрываем соединение
    processManager.disconnect();
    console.log('✓ Пример завершен');
  }
}

// Запускаем пример
if (require.main === module) {
  fileResultsExample().catch(console.error);
}

export { fileResultsExample };
