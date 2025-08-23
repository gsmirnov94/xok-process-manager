# Process Manager HTTP API - Быстрый старт

## 🚀 Запуск за 3 шага

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск API сервера
```bash
npm run start:api
```

### 3. Проверка работы
```bash
curl http://localhost:3000/health
```

## 📋 Основные команды

### Управление процессами
```bash
# Создать процесс
curl -X POST http://localhost:3000/processes \
  -H "Content-Type: application/json" \
  -d '{"name": "web-server", "script": "./server.js"}'

# Список процессов
curl http://localhost:3000/processes

# Запустить процесс
curl -X POST http://localhost:3000/processes/web-server/start

# Остановить процесс
curl -X POST http://localhost:3000/processes/web-server/stop

# Удалить процесс
curl -X DELETE http://localhost:3000/processes/web-server
```

### Управление результатами
```bash
# Сохранить файл результата
curl -X POST http://localhost:3000/processes/web-server/results \
  -H "Content-Type: application/json" \
  -d '{"fileName": "output.txt", "content": "Process completed"}'

# Получить результаты
curl http://localhost:3000/processes/web-server/results

# Создать ZIP архив
curl -X POST http://localhost:3000/processes/web-server/results/zip
```

## 🎯 Демонстрация

Запустите полную демонстрацию всех возможностей API:

```bash
# В первом терминале
npm run start:api

# Во втором терминале
npm run demo:api
```

## 📚 Документация

- **Полная документация**: `docs/API.md`
- **Примеры кода**: `examples/api-usage-examples.ts`
- **Демо скрипт**: `examples/demo-api.js`

## 🔧 Разработка

```bash
# Режим разработки с автоперезагрузкой
npm run dev:api

# Тестирование
npm test

# Сборка
npm run build
```

## 🌐 Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/health` | Проверка состояния |
| POST | `/processes` | Создание процесса |
| GET | `/processes` | Список процессов |
| GET | `/processes/:name` | Информация о процессе |
| POST | `/processes/:name/start` | Запуск процесса |
| POST | `/processes/:name/stop` | Остановка процесса |
| DELETE | `/processes/:name` | Удаление процесса |
| POST | `/processes/:name/results` | Сохранение результата |
| GET | `/processes/:name/results` | Получение результатов |
| POST | `/processes/:name/results/zip` | Создание ZIP архива |
| GET | `/statistics` | Статистика системы |

## ⚠️ Важно

- API сервер работает на порту 3000
- Требуется установленный PM2
- Для продакшена добавьте аутентификацию
- Используйте HTTPS в продакшене

## 🆘 Поддержка

- Проверьте логи сервера
- Убедитесь, что PM2 установлен
- Проверьте порт 3000 на занятость
- Запустите тесты: `npm test`
