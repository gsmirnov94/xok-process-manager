# Process Manager HTTP API

## Обзор

Process Manager теперь включает полнофункциональный HTTP API для управления процессами через REST endpoints. API построен на Express.js и предоставляет все возможности управления процессами через HTTP запросы.

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск API сервера

```bash
# Запуск в режиме разработки
npm run dev:api

# Запуск в продакшене
npm run start:api

# Или напрямую
npx ts-node src/server.ts
```

### 3. Проверка работы

```bash
curl http://localhost:3000/health
```

## Основные возможности

### Управление процессами
- ✅ Создание процессов
- ✅ Запуск/остановка/перезапуск
- ✅ Мониторинг статуса
- ✅ Удаление процессов
- ✅ Массовые операции (остановка/перезапуск всех)

### Управление результатами
- ✅ Сохранение файлов результатов
- ✅ Получение списка файлов
- ✅ Создание ZIP архивов
- ✅ Очистка результатов
- ✅ Статистика

### Мониторинг
- ✅ Health check endpoint
- ✅ Детальная информация о процессах
- ✅ Статистика использования ресурсов

## Структура API

```
GET    /health                    - Проверка состояния сервера
POST   /init                      - Инициализация PM2

# Управление процессами
POST   /processes                 - Создание процесса
GET    /processes                 - Список всех процессов
GET    /processes/:name           - Информация о процессе
POST   /processes/:name/start     - Запуск процесса
POST   /processes/:name/stop      - Остановка процесса
POST   /processes/:name/restart   - Перезапуск процесса
DELETE /processes/:name           - Удаление процесса
GET    /processes/:name/status    - Статус процесса
POST   /processes/stop-all        - Остановка всех процессов
POST   /processes/restart-all     - Перезапуск всех процессов

# Управление результатами
POST   /processes/:name/results   - Сохранение файла результата
GET    /processes/:name/results   - Получение результатов процесса
GET    /results                   - Все результаты
POST   /processes/:name/results/zip - ZIP архив результатов процесса
POST   /results/zip               - ZIP архив всех результатов
DELETE /processes/:name/results/:fileName - Удаление файла результата
DELETE /processes/:name/results   - Очистка результатов процесса
DELETE /results                   - Очистка всех результатов

# Статистика и управление
GET    /statistics                - Статистика результатов
POST   /shutdown                  - Принудительное завершение
```

## Примеры использования

### Создание процесса

```bash
curl -X POST http://localhost:3000/processes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "web-server",
    "script": "./server.js",
    "env": {"NODE_ENV": "production", "PORT": "3001"},
    "instances": 2,
    "exec_mode": "cluster"
  }'
```

### Получение списка процессов

```bash
curl http://localhost:3000/processes
```

### Запуск процесса

```bash
curl -X POST http://localhost:3000/processes/web-server/start
```

### Сохранение файла результата

```bash
curl -X POST http://localhost:3000/processes/web-server/results \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "access.log",
    "content": "User accessed /api endpoint at 2024-01-01T12:00:00Z"
  }'
```

### Создание ZIP архива

```bash
curl -X POST http://localhost:3000/processes/web-server/results/zip \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "compressionLevel": 9,
      "includeProcessName": true
    }
  }'
```

## Использование в коде

### JavaScript/Node.js клиент

```javascript
import { ProcessManagerAPIClient } from './examples/api-usage-examples';

const client = new ProcessManagerAPIClient('http://localhost:3000');

// Создание процесса
await client.createProcess({
  name: 'my-process',
  script: './script.js',
  env: { NODE_ENV: 'production' }
});

// Запуск процесса
await client.startProcess('my-process');

// Получение статуса
const status = await client.getProcessStatus('my-process');
console.log('Status:', status);
```

### TypeScript

```typescript
import { ProcessManagerAPI, ProcessManager } from './src';

// Создание API сервера
const processManager = new ProcessManager({
  maxProcesses: 20,
  autoRestart: true
});

const apiServer = new ProcessManagerAPI(processManager, 3000);

// Запуск сервера
await apiServer.start();
```

## Конфигурация

### Настройки ProcessManager

```typescript
const processManager = new ProcessManager({
  maxProcesses: 20,           // Максимальное количество процессов
  autoRestart: true,          // Автоматический перезапуск
  logLevel: 'info',           // Уровень логирования
  defaultOutputDirectory: './process-results' // Директория для результатов
});
```

### Настройки API сервера

```typescript
const apiServer = new ProcessManagerAPI(processManager, 3000);
```

## Безопасность

⚠️ **Важно**: Текущая версия API не включает аутентификацию. Для продакшена рекомендуется:

1. Добавить аутентификацию (JWT, API ключи)
2. Настроить CORS для ограничения доступа
3. Использовать HTTPS
4. Добавить rate limiting
5. Валидация входных данных

## Мониторинг

### Health Check

```bash
curl http://localhost:3000/health
```

Ответ:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "activeProcesses": 5
}
```

### Логирование

API сервер логирует все HTTP запросы:
```
2024-01-01T00:00:00.000Z - POST /processes
2024-01-01T00:00:00.000Z - GET /processes
2024-01-01T00:00:00.000Z - POST /processes/web-server/start
```

## Разработка

### Запуск в режиме разработки

```bash
npm run dev:api
```

### Сборка

```bash
npm run build
```

### Тестирование

```bash
npm test
```

## Структура файлов

```
src/
├── process-manager.ts    # Основной класс ProcessManager
├── api-server.ts         # HTTP API сервер
├── server.ts            # Точка входа для API сервера
├── types.ts             # TypeScript типы
└── index.ts             # Основной экспорт

examples/
├── api-usage-examples.ts # Примеры использования API
└── ...

docs/
└── API.md               # Подробная документация API
```

## Зависимости

### Основные
- `express` - HTTP сервер
- `cors` - CORS middleware
- `axios` - HTTP клиент для примеров

### Разработка
- `@types/express` - TypeScript типы для Express
- `@types/cors` - TypeScript типы для CORS

## Поддержка

Для получения помощи или сообщения об ошибках:

1. Проверьте документацию в `docs/API.md`
2. Изучите примеры в `examples/api-usage-examples.ts`
3. Запустите тесты: `npm test`

## Лицензия

ISC License
