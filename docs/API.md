# Process Manager HTTP API Documentation

## Обзор

Process Manager предоставляет HTTP API для управления процессами через PM2. API построен на Express.js и поддерживает все основные операции управления процессами.

## Базовый URL

```
http://localhost:3000
```

## Аутентификация

В текущей версии API не требует аутентификации. Для продакшена рекомендуется добавить аутентификацию.

## Формат ответов

Все API endpoints возвращают JSON ответы в следующем формате:

### Успешный ответ
```json
{
  "success": true,
  "message": "Операция выполнена успешно",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Ошибка
```json
{
  "success": false,
  "error": "Описание ошибки",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Endpoints

### 1. Health Check

**GET** `/health`

Проверка состояния сервера.

**Ответ:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "activeProcesses": 5
}
```

### 2. Инициализация PM2

**POST** `/init`

Инициализирует соединение с PM2.

**Ответ:**
```json
{
  "success": true,
  "message": "PM2 initialized successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Управление процессами

#### 3.1 Создание процесса

**POST** `/processes`

Создает новый процесс.

**Тело запроса:**
```json
{
  "name": "my-process",
  "script": "./script.js",
  "args": ["--env", "production"],
  "cwd": "/path/to/working/directory",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000"
  },
  "instances": 1,
  "exec_mode": "fork",
  "watch": false,
  "ignore_watch": ["node_modules", "logs"],
  "max_memory_restart": "1G",
  "time": true,
  "outputDirectory": "./custom-output"
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Process my-process created successfully",
  "pmId": 123,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.2 Получение списка процессов

**GET** `/processes`

Возвращает список всех процессов.

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 12345,
      "name": "my-process",
      "status": "online",
      "cpu": 2.5,
      "memory": 52428800,
      "uptime": 3600000,
      "restarts": 0,
      "pm_id": 123
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.3 Получение информации о процессе

**GET** `/processes/:name`

Возвращает детальную информацию о конкретном процессе.

**Параметры:**
- `name` - имя процесса

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 12345,
    "name": "my-process",
    "status": "online",
    "cpu": 2.5,
    "memory": 52428800,
    "uptime": 3600000,
    "restarts": 0,
    "pm_id": 123
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.4 Запуск процесса

**POST** `/processes/:name/start`

Запускает процесс по имени.

**Параметры:**
- `name` - имя процесса

**Ответ:**
```json
{
  "success": true,
  "message": "Process my-process started successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.5 Остановка процесса

**POST** `/processes/:name/stop`

Останавливает процесс по имени.

**Параметры:**
- `name` - имя процесса

**Ответ:**
```json
{
  "success": true,
  "message": "Process my-process stopped successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.6 Перезапуск процесса

**POST** `/processes/:name/restart`

Перезапускает процесс по имени.

**Параметры:**
- `name` - имя процесса

**Ответ:**
```json
{
  "success": true,
  "message": "Process my-process restarted successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.7 Удаление процесса

**DELETE** `/processes/:name`

Удаляет процесс по имени.

**Параметры:**
- `name` - имя процесса

**Ответ:**
```json
{
  "success": true,
  "message": "Process my-process deleted successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.8 Получение статуса процесса

**GET** `/processes/:name/status`

Возвращает текущий статус процесса.

**Параметры:**
- `name` - имя процесса

**Ответ:**
```json
{
  "success": true,
  "data": {
    "name": "my-process",
    "status": "online"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.9 Остановка всех процессов

**POST** `/processes/stop-all`

Останавливает все процессы.

**Ответ:**
```json
{
  "success": true,
  "message": "All processes stopped successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3.10 Перезапуск всех процессов

**POST** `/processes/restart-all`

Перезапускает все процессы.

**Ответ:**
```json
{
  "success": true,
  "message": "All processes restarted successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4. Управление результатами

#### 4.1 Сохранение файла результата

**POST** `/processes/:name/results`

Сохраняет файл результата для процесса.

**Параметры:**
- `name` - имя процесса

**Тело запроса:**
```json
{
  "fileName": "output.txt",
  "content": "Результат выполнения процесса",
  "encoding": "utf8"
}
```

**Поддерживаемые кодировки:**
- `utf8` - обычный текст (по умолчанию)
- `base64` - бинарные данные в base64

**Ответ:**
```json
{
  "success": true,
  "message": "Result file saved successfully",
  "data": {
    "fileName": "output.txt",
    "filePath": "/path/to/file"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 4.2 Получение результатов процесса

**GET** `/processes/:name/results`

Возвращает список файлов результатов для процесса.

**Параметры:**
- `name` - имя процесса

**Ответ:**
```json
{
  "success": true,
  "data": {
    "processName": "my-process",
    "files": [
      {
        "name": "output.txt",
        "path": "/path/to/file",
        "size": 1024,
        "modified": "2024-01-01T00:00:00.000Z",
        "processName": "my-process"
      }
    ],
    "totalSize": 1024,
    "fileCount": 1
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 4.3 Получение всех результатов

**GET** `/results`

Возвращает результаты всех процессов.

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "processName": "process-1",
      "files": [...],
      "totalSize": 1024,
      "fileCount": 1
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 4.4 Создание ZIP архива с результатами процесса

**POST** `/processes/:name/results/zip`

Создает ZIP архив с результатами конкретного процесса.

**Параметры:**
- `name` - имя процесса

**Тело запроса:**
```json
{
  "outputPath": "/custom/path/archive.zip",
  "options": {
    "compressionLevel": 6,
    "includeProcessName": true,
    "flattenStructure": false
  }
}
```

**Опции архива:**
- `compressionLevel` - уровень сжатия (1-9, по умолчанию 6)
- `includeProcessName` - включать ли имя процесса в структуру архива
- `flattenStructure` - уплощать структуру архива

**Ответ:**
```json
{
  "success": true,
  "message": "ZIP archive created successfully",
  "data": {
    "zipPath": "/path/to/archive.zip"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 4.5 Создание ZIP архива со всеми результатами

**POST** `/results/zip`

Создает ZIP архив со всеми результатами всех процессов.

**Тело запроса:**
```json
{
  "outputPath": "/custom/path/all-results.zip",
  "options": {
    "compressionLevel": 6,
    "includeProcessName": true,
    "flattenStructure": false
  }
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "ZIP archive with all results created successfully",
  "data": {
    "zipPath": "/path/to/all-results.zip"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 4.6 Удаление файла результата

**DELETE** `/processes/:name/results/:fileName`

Удаляет конкретный файл результата.

**Параметры:**
- `name` - имя процесса
- `fileName` - имя файла

**Ответ:**
```json
{
  "success": true,
  "message": "Result file output.txt deleted successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 4.7 Очистка результатов процесса

**DELETE** `/processes/:name/results`

Удаляет все файлы результатов для процесса.

**Параметры:**
- `name` - имя процесса

**Ответ:**
```json
{
  "success": true,
  "message": "All result files for process my-process cleared successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 4.8 Очистка всех результатов

**DELETE** `/results`

Удаляет все файлы результатов всех процессов.

**Ответ:**
```json
{
  "success": true,
  "message": "All result files cleared successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 5. Статистика

#### 5.1 Получение статистики

**GET** `/statistics`

Возвращает статистику по результатам процессов.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "totalProcesses": 5,
    "totalFiles": 25,
    "totalSize": 1048576,
    "processesWithResults": 3,
    "averageFilesPerProcess": 8.33,
    "averageFileSize": 41943.04
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 6. Управление сервером

#### 6.1 Принудительное завершение

**POST** `/shutdown`

Инициирует принудительное завершение всех процессов и сервера.

**Ответ:**
```json
{
  "success": true,
  "message": "Shutdown initiated",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Коды ошибок HTTP

- `200` - Успешное выполнение
- `400` - Неверный запрос (отсутствуют обязательные параметры)
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера

## Примеры использования

### cURL

#### Создание процесса
```bash
curl -X POST http://localhost:3000/processes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-process",
    "script": "./test.js",
    "env": {"NODE_ENV": "test"}
  }'
```

#### Получение списка процессов
```bash
curl http://localhost:3000/processes
```

#### Запуск процесса
```bash
curl -X POST http://localhost:3000/processes/test-process/start
```

### JavaScript/Node.js

```javascript
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

// Создание процесса
const createProcess = async () => {
  try {
    const response = await axios.post(`${API_BASE}/processes`, {
      name: 'my-process',
      script: './script.js',
      env: { NODE_ENV: 'production' }
    });
    console.log('Process created:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

// Получение статуса
const getStatus = async (processName) => {
  try {
    const response = await axios.get(`${API_BASE}/processes/${processName}/status`);
    console.log('Status:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};
```

## Запуск сервера

```bash
# Установка зависимостей
npm install

# Запуск API сервера
npm run start:api

# Или напрямую
npx ts-node src/server.ts
```

## Логирование

API сервер логирует все HTTP запросы в формате:
```
2024-01-01T00:00:00.000Z - POST /processes
2024-01-01T00:00:00.000Z - GET /processes
```

## Безопасность

- В продакшене рекомендуется добавить аутентификацию и авторизацию
- Настройте CORS для ограничения доступа с определенных доменов
- Используйте HTTPS в продакшене
- Ограничьте размер загружаемых файлов через `express.json({ limit: '10mb' })`

## Мониторинг

API предоставляет endpoint `/health` для мониторинга состояния сервера. Рекомендуется настроить периодические проверки этого endpoint'а для отслеживания доступности сервиса.
