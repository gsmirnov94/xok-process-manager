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

### Локальная установка для разработки

```bash
npm install
```

### Установка через npm

```bash
npm install xok-process-manager
```

**Примечание:** PM2 автоматически установится как зависимость при установке пакета.

### Или с помощью yarn

```bash
yarn add xok-process-manager
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
import { ProcessManager } from 'xok-process-manager';

const processManager = new ProcessManager({
  maxProcesses: 5,
  autoRestart: true,
  logLevel: 'info'
});
```

### Использование с конфигурацией по умолчанию

```typescript
import { ProcessManager } from 'xok-process-manager';

const processManager = new ProcessManager({
  maxProcesses: 10,
  autoRestart: true,
  logLevel: 'info',
  defaultProcessConfig: {
    instances: 2,
    execMode: 'cluster',
    watch: true,
    env: {
      NODE_ENV: 'production'
    },
    callbacks: {
      onStart: () => console.log('🟢 Процесс запущен'),
      onStop: () => console.log('🔴 Процесс остановлен')
    }
  }
});

// Теперь все новые процессы будут автоматически использовать эти настройки по умолчанию
const processId = await processManager.createProcess({
  name: 'my-app',
  script: './app.js'
  // Остальные настройки будут взяты из defaultProcessConfig
});
```

// Важно: дождаться инициализации соединения с PM2
await processManager.init();

// Создание процесса с колбэками
const processId = await processManager.createProcess({
  name: 'my-process',
  script: './script.js',
  instances: 1,
  execMode: 'fork',
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

### API Сервер с глобальными колбэками

Process Manager также предоставляет HTTP API сервер, который позволяет применять глобальные колбэки ко всем создаваемым процессам:

```typescript
import { ProcessManagerAPI } from './src/api-server';
import { ProcessManager } from './src/process-manager';
import { ProcessCallbacks } from './src/types';

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
```

**Преимущества глобальных колбэков:**
- **Централизованное управление**: все колбэки определены в одном месте
- **Автоматическое применение**: каждый создаваемый процесс автоматически получает глобальные колбэки
- **Гибкость**: можно определить только нужные колбэки (например, только `onStart` и `onStop`)
- **Переиспользование**: один набор колбэков применяется ко всем процессам

**HTTP Endpoints:**
- `POST /processes` - создание процесса (автоматически применит глобальные колбэки)
- `GET /processes` - список всех процессов
- `GET /processes/:name` - информация о процессе
- `POST /processes/:name/start` - запуск процесса
- `POST /processes/:name/stop` - остановка процесса
- `POST /processes/:name/restart` - перезапуск процесса
- `DELETE /processes/:name` - удаление процесса
- И многие другие...

### Примеры использования HTTP API

#### Создание процесса через API

```bash
# Создание процесса с минимальной конфигурацией
curl -X POST http://localhost:3000/processes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "web-server",
    "script": "./server.js"
  }'

# Создание процесса с дополнительными параметрами
curl -X POST http://localhost:3000/processes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api-service",
    "script": "./api.js",
    "instances": 4,
    "env": {
      "PORT": "8080",
      "NODE_ENV": "production"
    }
  }'
```

#### Управление процессами через API

```bash
# Получение списка всех процессов
curl http://localhost:3000/processes

# Получение информации о конкретном процессе
curl http://localhost:3000/processes/web-server

# Запуск процесса
curl -X POST http://localhost:3000/processes/web-server/start

# Остановка процесса
curl -X POST http://localhost:3000/processes/web-server/stop

# Перезапуск процесса
curl -X POST http://localhost:3000/processes/web-server/restart

# Удаление процесса
curl -X DELETE http://localhost:3000/processes/web-server
```

#### Массовые операции через API

```bash
# Остановка всех процессов
curl -X POST http://localhost:3000/processes/stop-all

# Перезапуск всех процессов
curl -X POST http://localhost:3000/processes/restart-all

# Получение статистики всех процессов
curl http://localhost:3000/processes/stats
```

#### Работа с результатами через API

```bash
# Получение файлов результатов процесса
curl http://localhost:3000/processes/web-server/results

# Создание zip-архива с результатами
curl -X POST http://localhost:3000/processes/web-server/results/zip

# Создание zip-архива со всеми результатами
curl -X POST http://localhost:3000/processes/results/zip-all

# Получение статистики по результатам
curl http://localhost:3000/processes/results/stats
```

### Полный пример с дефолтным конфигом и API

```typescript
import { ProcessManagerAPI } from 'xok-process-manager';
import { ProcessManager } from 'xok-process-manager';

// Создаем ProcessManager с дефолтным конфигом
const processManager = new ProcessManager({
  maxProcesses: 10,
  autoRestart: true,
  logLevel: 'info',
  defaultProcessConfig: {
    instances: 2,
    execMode: 'cluster',
    watch: true,
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    callbacks: {
      onStart: async () => {
        console.log('🚀 Процесс запущен с дефолтными настройками');
        // Здесь можно добавить логику мониторинга, метрики и т.д.
      },
      onStop: async () => {
        console.log('⏹️ Процесс остановлен');
      },
      onRestart: async () => {
        console.log('🔄 Процесс перезапущен');
      },
      onDelete: async () => {
        console.log('🗑️ Процесс удален');
      }
    }
  }
});

// Создаем API сервер
const apiServer = new ProcessManagerAPI(processManager, 3000);

// Запускаем API сервер
await apiServer.start();

console.log('🌐 API сервер запущен на http://localhost:3000');
console.log('📋 Все процессы будут автоматически использовать дефолтный конфиг');
console.log('🔗 Документация API: http://localhost:3000/docs');
```

### JavaScript пример для браузера

```javascript
// Создание процесса через fetch API
async function createProcess(name, script, options = {}) {
  const response = await fetch('http://localhost:3000/processes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      script,
      ...options
    })
  });
  
  return await response.json();
}

// Использование
createProcess('my-app', './app.js', {
  instances: 3,
  env: { PORT: '3001' }
}).then(result => {
  console.log('Процесс создан:', result);
}).catch(error => {
  console.error('Ошибка:', error);
});

// Получение списка процессов
async function getProcesses() {
  const response = await fetch('http://localhost:3000/processes');
  return await response.json();
}

// Управление процессом
async function controlProcess(name, action) {
  const response = await fetch(`http://localhost:3000/processes/${name}/${action}`, {
    method: 'POST'
  });
  return await response.json();
}

// Примеры использования
getProcesses().then(processes => {
  console.log('Активные процессы:', processes);
});

controlProcess('my-app', 'restart').then(result => {
  console.log('Процесс перезапущен:', result);
});
```

### Python пример

```python
import requests
import json

# Базовый URL API
BASE_URL = "http://localhost:3000"

def create_process(name, script, **options):
    """Создание процесса через API"""
    url = f"{BASE_URL}/processes"
    data = {
        "name": name,
        "script": script,
        **options
    }
    
    response = requests.post(url, json=data)
    return response.json()

def get_processes():
    """Получение списка всех процессов"""
    url = f"{BASE_URL}/processes"
    response = requests.get(url)
    return response.json()

def control_process(name, action):
    """Управление процессом (start, stop, restart)"""
    url = f"{BASE_URL}/processes/{name}/{action}"
    response = requests.post(url)
    return response.json()

# Примеры использования
if __name__ == "__main__":
    # Создание процесса
    result = create_process(
        name="python-app",
        script="./app.py",
        instances=2,
        env={"PYTHONPATH": "/usr/local/lib/python3.9"}
    )
    print(f"Процесс создан: {result}")
    
    # Получение списка процессов
    processes = get_processes()
    print(f"Активные процессы: {processes}")
    
    # Перезапуск процесса
    restart_result = control_process("python-app", "restart")
    print(f"Процесс перезапущен: {restart_result}")
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
- `defaultProcessConfig`: Конфигурация по умолчанию для всех новых процессов (объединяется с переданной конфигурацией)

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
  execMode?: 'fork' | 'cluster'; // Режим выполнения
  watch?: boolean;                 // Автоматический перезапуск при изменении файлов
  callbacks?: ProcessCallbacks;    // Колбэк функции
  outputDirectory?: string;        // Директория для файлов результатов
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

### Пример с API сервером

```typescript
import { ProcessManagerAPI } from './src/api-server';
import { ProcessManager } from './src/process-manager';

// Создаем ProcessManager
const processManager = new ProcessManager({
  maxProcesses: 10,
  autoRestart: true,
  logLevel: 'info'
});

// Определяем глобальные колбэки
const globalCallbacks = {
  onStart: async () => {
    console.log('🟢 Процесс запущен - глобальное уведомление');
    // Можно добавить логирование, метрики, уведомления и т.д.
  },
  onStop: async () => {
    console.log('🔴 Процесс остановлен - глобальное уведомление');
  },
  onRestart: async () => {
    console.log('🔄 Процесс перезапущен - глобальное уведомление');
  },
  onDelete: async () => {
    console.log('🗑️ Процесс удален - глобальное уведомление');
  }
};

// Создаем API сервер с глобальными колбэками
const apiServer = new ProcessManagerAPI(processManager, 3000, globalCallbacks);

// Запускаем API сервер
await apiServer.start();

console.log('API сервер запущен на http://localhost:3000');
console.log('Все создаваемые процессы будут автоматически использовать глобальные колбэки');
```

Смотрите файл `examples/demo-api.js` для полной демонстрации API сервера.

## Требования

- Node.js 16+
- PM2 установлен глобально или локально
- TypeScript 5.0+

## Лицензия

ISC
