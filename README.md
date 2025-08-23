# Process Manager

Node.js TypeScript проект для управления процессами с использованием PM2.

## Возможности

- Создание процессов с колбэк функциями
- Управление жизненным циклом процессов (запуск, остановка, перезапуск, удаление)
- Мониторинг состояния процессов
- Асинхронные операции с Promise API
- Полная типизация TypeScript
- Автоматическая инициализация соединения с PM2
- **Управление файлами результатов процессов**
- **Создание zip-архивов с результатами**
- **Автоматическая организация файлов по процессам**
- **Статистика и мониторинг результатов**

## Установка

```bash
npm install
```

## Сборка

```bash
npm run build
```

## Запуск в режиме разработки

```bash
npm run dev
```

## Запуск в продакшене

```bash
npm run build
npm start
```

## Использование

### Базовое использование

```typescript
import { ProcessManager } from './src';

const processManager = new ProcessManager({
  maxProcesses: 5,
  autoRestart: true,
  logLevel: 'info'
});

// Важно: дождаться инициализации соединения с PM2
await processManager.init();

// Создание процесса с колбэками
const processId = await processManager.createProcess({
  name: 'my-process',
  script: './script.js',
  instances: 1,
  exec_mode: 'fork',
  callbacks: {
    onStart: () => console.log('Process started'),
    onStop: () => console.log('Process stopped'),
    onRestart: () => console.log('Process restarted'),
    onDelete: () => console.log('Process deleted')
  }
});
```

### Управление процессами

```typescript
// Запуск процесса
await processManager.startProcess('my-process');

// Остановка процесса
await processManager.stopProcess('my-process');

// Перезапуск процесса
await processManager.restartProcess('my-process');

// Удаление процесса
await processManager.deleteProcess('my-process');

// Получение информации о процессе
const info = await processManager.getProcessInfo('my-process');

// Получение статуса процесса
const status = await processManager.getProcessStatus('my-process');

// Получение списка всех процессов
const processes = await processManager.getAllProcesses();
```

### Массовые операции

```typescript
// Остановка всех процессов
await processManager.stopAllProcesses();

// Перезапуск всех процессов
await processManager.restartAllProcesses();
```

### Работа с файлами результатов

```typescript
// Сохранение файла результата для процесса
await processManager.saveResultFile('my-process', 'output.txt', 'Результат выполнения');

// Получение списка файлов результатов процесса
const resultFiles = await processManager.getProcessResultFiles('my-process');

// Получение информации о результатах процесса
const processResults = await processManager.getProcessResults('my-process');

// Создание zip-архива с результатами процесса
const zipPath = await processManager.createProcessResultsZip('my-process', undefined, {
  includeProcessName: true,
  compressionLevel: 6
});

// Создание zip-архива со всеми результатами всех процессов
const allResultsZip = await processManager.createAllResultsZip(undefined, {
  includeProcessName: true,
  flattenStructure: false,
  compressionLevel: 8
});

// Получение статистики по всем результатам
const statistics = await processManager.getResultsStatistics();

// Удаление файла результата
await processManager.deleteResultFile('my-process', 'output.txt');

// Очистка всех результатов процесса
await processManager.clearProcessResults('my-process');

// Очистка всех результатов всех процессов
await processManager.clearAllResults();
```

### Утилиты

```typescript
// Количество активных процессов
const count = processManager.getActiveProcessCount();

// Проверка существования процесса
const exists = processManager.hasProcess('my-process');

// Список имен процессов
const names = processManager.getProcessNames();
```

## API

### ProcessManager

Основной класс для управления процессами.

#### Конструктор

```typescript
constructor(options?: ProcessManagerOptions)
```

#### Методы

- `init(): Promise<void>` - Инициализирует соединение с PM2
- `createProcess(config: ProcessConfig): Promise<number>` - Создает новый процесс
- `startProcess(name: string): Promise<void>` - Запускает процесс
- `stopProcess(name: string): Promise<void>` - Останавливает процесс
- `restartProcess(name: string): Promise<void>` - Перезапускает процесс
- `deleteProcess(name: string): Promise<void>` - Удаляет процесс
- `getProcessInfo(name: string): Promise<ProcessInfo | null>` - Получает информацию о процессе
- `getProcessStatus(name: string): Promise<string>` - Получает статус процесса
- `getAllProcesses(): Promise<ProcessInfo[]>` - Получает список всех процессов
- `stopAllProcesses(): Promise<void>` - Останавливает все процессы
- `restartAllProcesses(): Promise<void>` - Перезапускает все процессы
- `forceShutdown(): Promise<void>` - Принудительно завершает все процессы
- `disconnect(): void` - Закрывает соединение с PM2
- `saveResultFile(processName: string, fileName: string, content: string | Buffer): Promise<string>` - Сохраняет файл результата
- `getProcessResultFiles(processName: string): Promise<ResultFile[]>` - Получает список файлов результатов процесса
- `getProcessResults(processName: string): Promise<ProcessResults>` - Получает информацию о результатах процесса
- `getAllProcessResults(): Promise<ProcessResults[]>` - Получает все результаты всех процессов
- `createProcessResultsZip(processName: string, outputPath?: string, options?: ZipArchiveOptions): Promise<string>` - Создает zip-архив с результатами процесса
- `createAllResultsZip(outputPath?: string, options?: ZipArchiveOptions): Promise<string>` - Создает zip-архив со всеми результатами
- `deleteResultFile(processName: string, fileName: string): Promise<void>` - Удаляет файл результата
- `clearProcessResults(processName: string): Promise<void>` - Очищает все результаты процесса
- `clearAllResults(): Promise<void>` - Очищает все результаты всех процессов
- `getResultsStatistics(): Promise<ResultsStatistics>` - Получает статистику по результатам

#### Опции

- `maxProcesses`: Максимальное количество процессов (по умолчанию: 10)
- `autoRestart`: Автоматический перезапуск процессов (по умолчанию: true)
- `logLevel`: Уровень логирования (по умолчанию: 'info')
- `defaultOutputDirectory`: Директория по умолчанию для файлов результатов (по умолчанию: './process-results')

### ProcessConfig

Конфигурация процесса.

```typescript
interface ProcessConfig {
  name: string;                    // Имя процесса
  script: string;                  // Путь к скрипту
  args?: string[];                 // Аргументы командной строки
  cwd?: string;                    // Рабочая директория
  env?: Record<string, string>;    // Переменные окружения
  instances?: number;              // Количество экземпляров
  exec_mode?: 'fork' | 'cluster'; // Режим выполнения
  watch?: boolean;                 // Автоматический перезапуск при изменении файлов
  callbacks?: ProcessCallbacks;    // Колбэк функции
  outputDirectoryPath?: string;    // Директория для файлов результатов
}
```

### ProcessCallbacks

Колбэк функции для различных событий процесса.

```typescript
interface ProcessCallbacks {
  onStart?: () => void | Promise<void>;    // При запуске
  onStop?: () => void | Promise<void>;     // При остановке
  onRestart?: () => void | Promise<void>;  // При перезапуске
  onDelete?: () => void | Promise<void>;   // При удалении
}
```

### ResultFile

Информация о файле результата.

```typescript
interface ResultFile {
  name: string;        // Имя файла
  path: string;        // Полный путь к файлу
  size: number;        // Размер файла в байтах
  modified: Date;      // Дата последнего изменения
  processName: string; // Имя процесса
}
```

### ProcessResults

Информация о результатах процесса.

```typescript
interface ProcessResults {
  processName: string;  // Имя процесса
  files: ResultFile[];  // Список файлов результатов
  totalSize: number;    // Общий размер всех файлов
  fileCount: number;    // Количество файлов
}
```

### ZipArchiveOptions

Опции для создания zip-архивов.

```typescript
interface ZipArchiveOptions {
  includeProcessName?: boolean;  // Включать ли имя процесса в структуру архива
  flattenStructure?: boolean;    // Сглаживать ли структуру папок
  compressionLevel?: number;     // Уровень сжатия (1-9)
  password?: string;             // Пароль для архива
}
```

### ResultsStatistics

Статистика по результатам всех процессов.

```typescript
interface ResultsStatistics {
  totalProcesses: number;           // Общее количество процессов
  totalFiles: number;               // Общее количество файлов
  totalSize: number;                // Общий размер всех файлов
  processesWithResults: number;     // Количество процессов с результатами
  averageFilesPerProcess: number;   // Среднее количество файлов на процесс
  averageFileSize: number;          // Средний размер файла
}
```

## Примеры

### Простой пример

```typescript
const processManager = new ProcessManager();
await processManager.init();

const processId = await processManager.createProcess({
  name: 'my-app',
  script: './app.js',
  callbacks: {
    onStart: () => console.log('App started!'),
    onStop: () => console.log('App stopped!')
  }
});
```

### Продвинутый пример

Смотрите файл `examples/advanced-usage.ts` для полного примера с множественными процессами и мониторингом.

## Требования

- Node.js 16+
- PM2 установлен глобально или локально
- TypeScript 5.0+

## Лицензия

ISC
