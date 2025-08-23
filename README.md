# Process Manager

Node.js TypeScript проект для управления процессами с использованием PM2.

## Возможности

- Создание процессов с колбэк функциями
- Управление жизненным циклом процессов (запуск, остановка, перезапуск, удаление)
- Мониторинг состояния процессов
- Асинхронные операции с Promise API
- Полная типизация TypeScript
- Автоматическая инициализация соединения с PM2

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

#### Опции

- `maxProcesses`: Максимальное количество процессов (по умолчанию: 10)
- `autoRestart`: Автоматический перезапуск процессов (по умолчанию: true)
- `logLevel`: Уровень логирования (по умолчанию: 'info')

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
