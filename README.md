# XOK Process Manager

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![PM2](https://img.shields.io/badge/PM2-5.3+-orange.svg)](https://pm2.keymetrics.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Менеджер процессов на базе PM2 с TypeScript, предоставляющий REST API для управления Node.js процессами, мониторинга и работы с результатами выполнения.

## 🚀 Возможности

- **Управление процессами**: Запуск, остановка, перезапуск и удаление процессов
- **Мониторинг**: Отслеживание CPU, памяти, времени работы и количества перезапусков
- **REST API**: Полнофункциональный HTTP API для интеграции
- **Безопасность**: Валидация входных данных и защита от path traversal атак
- **Docker поддержка**: Готовые образы для развертывания
- **TypeScript**: Полная типизация для разработки
- **Тестирование**: Jest тесты с покрытием кода
- **Архивирование**: Создание ZIP архивов результатов процессов

## 📋 Требования

- Node.js >= 16.0.0
- PM2 >= 5.0.0 (peer dependency)
- TypeScript >= 5.0.0 (для разработки)

## 🛠️ Установка

### Локальная установка

```bash
# Клонирование репозитория
git clone https://github.com/gsmirnov94/xok-process-manager.git
cd xok-process-manager

# Установка зависимостей
npm install

# Сборка проекта
npm run build

# Запуск API сервера
npm run start:api
```

### Docker установка

```bash
# Сборка образа
docker build -t xok-process-manager .

# Запуск контейнера
docker run -d \
  --name xok-process-manager \
  -p 3000:3000 \
  -v $(pwd)/process-scripts:/app/scripts \
  -v $(pwd)/process-results:/app/process-results \
  xok-process-manager
```

### Docker Compose

```bash
docker-compose up -d
```

## 🚀 Использование

### Запуск API сервера

```bash
# Разработка
npm run dev:api

# Продакшн
npm run start:api
```

Сервер запустится на `http://localhost:3000`

### Основные команды

```bash
# Сборка проекта
npm run build

# Запуск тестов
npm test

# Запуск тестов с покрытием
npm run test:coverage

# Запуск в режиме разработки
npm run dev

# Запуск примера
npm run example
```

## 📚 API Endpoints

### Health Check
- `GET /health` - Проверка состояния сервера

### Управление процессами
- `POST /init` - Инициализация PM2
- `POST /processes` - Создание нового процесса
- `GET /processes` - Список всех процессов
- `GET /processes/ids` - Список ID процессов с именами
- `GET /processes/:id` - Информация о процессе по ID
- `POST /processes/:id/start` - Запуск процесса
- `POST /processes/:id/stop` - Остановка процесса
- `POST /processes/:id/restart` - Перезапуск процесса
- `DELETE /processes/:id` - Удаление процесса
- `GET /processes/:id/status` - Статус процесса

### Массовые операции
- `POST /processes/stop-all` - Остановка всех процессов
- `POST /processes/restart-all` - Перезапуск всех процессов

### Результаты процессов
- `POST /processes/:id/results` - Сохранение файла результата
- `GET /processes/:id/results` - Получение результатов процесса
- `GET /results` - Получение всех результатов
- `POST /processes/:id/results/zip` - Создание ZIP архива результатов
- `POST /results/zip` - Создание ZIP архива всех результатов
- `DELETE /processes/:id/results/:fileName` - Удаление файла результата
- `DELETE /processes/:id/results` - Очистка результатов процесса
- `DELETE /results` - Очистка всех результатов

### Дополнительные возможности
- `GET /scripts` - Доступные скрипты
- `GET /statistics` - Статистика результатов
- `POST /shutdown` - Принудительное завершение

## 🔧 Конфигурация

### Переменные окружения

- `SCRIPTS_DIRECTORY` - Директория со скриптами процессов (по умолчанию: `./process-scripts`)
- `PORT` - Порт API сервера (по умолчанию: `3000`)

### Структура проекта

```
xok-process-manager/
├── src/                    # Исходный код
│   ├── process-manager.ts  # Основной класс менеджера процессов
│   ├── process-manager-api.ts # REST API сервер
│   ├── server.ts           # Точка входа сервера
│   └── types.ts            # TypeScript типы
├── process-scripts/        # Скрипты процессов
├── process-results/        # Результаты выполнения
├── docker-compose.yml      # Docker Compose конфигурация
├── Dockerfile             # Docker образ
└── package.json           # Зависимости и скрипты
```

## 📝 Примеры использования

### Создание процесса

```typescript
import { ProcessManager } from './src/process-manager';

const processManager = new ProcessManager({
  defaultOutputDirectory: './process-results',
  scriptsDirectory: './process-scripts'
});

// Создание процесса
await processManager.createProcess({
  name: 'example-process',
  script: 'example-script.js',
  args: ['--env', 'production'],
  instances: 2,
  execMode: 'cluster',
  watch: true,
  callbacks: {
    onStart: () => console.log('Process started'),
    onStop: () => console.log('Process stopped')
  }
});
```

### REST API пример

```bash
# Создание процесса
curl -X POST http://localhost:3000/processes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-process",
    "script": "test-script.js",
    "instances": 1
  }'

# Получение списка процессов
curl http://localhost:3000/processes

# Запуск процесса
curl -X POST http://localhost:3000/processes/1/start

# Получение результатов
curl http://localhost:3000/processes/1/results
```

## 🧪 Тестирование

```bash
# Запуск всех тестов
npm test

# Тесты в режиме watch
npm run test:watch

# Тесты с покрытием
npm run test:coverage

# Подробные тесты
npm run test:verbose

# Отладка тестов
npm run test:debug
```

## 🐳 Docker

### Сборка образа

```bash
docker build -t xok-process-manager .
```

### Запуск контейнера

```bash
docker run -d \
  --name xok-process-manager \
  -p 3000:3000 \
  -v $(pwd)/process-scripts:/app/scripts \
  -v $(pwd)/process-results:/app/process-results \
  xok-process-manager
```

### Docker Compose

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f
```

## 🔒 Безопасность

Проект включает несколько уровней безопасности:

- **Валидация входных данных**: Проверка имен процессов и путей к скриптам
- **Защита от path traversal**: Предотвращение доступа к файлам вне разрешенных директорий
- **Валидация символов**: Проверка на наличие недопустимых символов
- **Ограничения длины**: Ограничения на длину имен и путей
- **Docker security**: Запуск от непривилегированного пользователя

## 📊 Мониторинг

- **PM2 интеграция**: Полная интеграция с PM2 для мониторинга процессов
- **Метрики**: CPU, память, время работы, количество перезапусков
- **Логирование**: Автоматическое логирование stdout/stderr
- **Статистика**: Сбор и анализ результатов выполнения

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 👨‍💻 Автор

**gsmirnov94** - [GitHub](https://github.com/gsmirnov94)

## 🐛 Поддержка

Если у вас есть вопросы или проблемы:

- Создайте [Issue](https://github.com/gsmirnov94/xok-process-manager/issues)
- Обратитесь к [документации](https://github.com/gsmirnov94/xok-process-manager#readme)

## 📈 Roadmap

- [ ] Web UI для управления процессами
- [ ] Prometheus метрики
- [ ] WebSocket для real-time обновлений
- [ ] Плагины для расширения функциональности
- [ ] Kubernetes интеграция
- [ ] Автоматическое масштабирование
- [ ] Алерты и уведомления
