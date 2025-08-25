## XOK Process Manager API — запуск в другом проекте

Этот сервис поднимает HTTP API для управления процессами (через PM2) и запуска скриптов из смонтированной папки. Ниже — как использовать контейнер этого проекта внутри ДРУГОГО репозитория и прокидывать в него директорию со скриптами.

### Что внутри контейнера
- Порт API: 3000 (экспортируется наружу)
- Директория скриптов в контейнере: `/app/scripts` (настраивается через `SCRIPTS_DIRECTORY`)
- Директория результатов: `/app/process-results`
- Директория логов: `/app/logs`

**Важно**: Переменная `SCRIPTS_DIRECTORY` указывает, где сервер ищет скрипты. По умолчанию это `./process-scripts`, но в Docker-контейнере мы переопределяем её в `/app/scripts`.

Сервер читает список скриптов из `SCRIPTS_DIRECTORY` и ожидает, что в API вы будете ссылаться ТОЛЬКО на имя файла (без поддиректорий, без абсолютных путей).

Поддерживаемые расширения для обнаружения: `.js`, `.ts`, `.py`, `.sh`.
- Готово «из коробки»: `.js` (Node.js есть в образе), `.sh` (используется `/bin/sh` из базового образа Alpine)
- Потребует доустановки интерпретатора в образ (если понадобится): `.py` (Python), `.ts` (ts-node)

---

### Вариант A — docker run из другого проекта
1) В этом репозитории соберите образ и задайте понятный тег (сделать один раз):
```bash
docker build -t xok-process-manager:latest .
```

2) В другом проекте запустите контейнер, смонтировав папку со своими скриптами:
```bash
docker run -d \
  --name xok-process-manager \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e SCRIPTS_DIRECTORY=/app/scripts \
  -v /ABS/PATH/TO/your-project/scripts:/app/scripts:ro \
  -v /ABS/PATH/TO/your-project/process-results:/app/process-results \
  -v /ABS/PATH/TO/your-project/logs:/app/logs \
  xok-process-manager:latest
```

Замените `/ABS/PATH/TO/...` на абсолютные пути вашей машины. Флаг `:ro` у папки скриптов делает её доступной только для чтения.

Проверка:
```bash
curl http://localhost:3000/health
```

---

### Вариант B — docker-compose внутри другого проекта
В другом репозитории добавьте в свой `docker-compose.yml` сервис, который использует уже собранный образ:
```yaml
services:
  process-manager-api:
    image: xok-process-manager:latest # или ваш реестр: ghcr.io/<org>/xok-process-manager:tag
    container_name: process-manager-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SCRIPTS_DIRECTORY=/app/scripts
    volumes:
      - /ABS/PATH/TO/your-project/process-results:/app/process-results
      - /ABS/PATH/TO/your-project/logs:/app/logs
      - /ABS/PATH/TO/your-project/scripts:/app/scripts:ro
    restart: unless-stopped
```

Если образ не загружен в реестр, соберите его локально (см. «Вариант A, шаг 1») или добавьте `build:` с путем на вашу локальную копию этого репозитория.

Пример с локальным билдом контекста (если этот репозиторий лежит рядом на диске):
```yaml
services:
  process-manager-api:
    build:
      context: /ABS/PATH/TO/xok-process-manager
    image: xok-process-manager:latest
    ports:
      - "3000:3000"
    environment:
      - SCRIPTS_DIRECTORY=/app/scripts
    volumes:
      - /ABS/PATH/TO/your-project/scripts:/app/scripts:ro
      - /ABS/PATH/TO/your-project/process-results:/app/process-results
      - /ABS/PATH/TO/your-project/logs:/app/logs
```

---

### Структура и адресация скриптов
- Скрипты должны лежать непосредственно в смонтированной корневой папке (без поддиректорий), т.к. API принимает только имя файла скрипта без разделителей.
- Примеры валидных значений поля `script` в API: `"example-script.js"`, `"run.sh"`.
- Невалидно: абсолютные пути, пути с `/` или `..`.

Проверить, что сервис «видит» ваши файлы:
```bash
curl http://localhost:3000/scripts
```

**Отладка SCRIPTS_DIRECTORY:**
```bash
# Проверить, что переменная установлена правильно
docker exec process-manager-api env | grep SCRIPTS_DIRECTORY

# Посмотреть содержимое директории скриптов в контейнере
docker exec process-manager-api ls -la /app/scripts

# Проверить логи сервера при запуске
docker logs process-manager-api | grep "scripts directory"
```

---

### Быстрые примеры API
1) Создать процесс (регистрация в PM2):
```bash
curl -X POST http://localhost:3000/processes \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "example",
    "script": "example-script.js",
    "args": ["--flag", "value"],
    "env": {"FOO": "bar"}
  }'
```

2) Запустить процесс по ID:
```bash
curl -X POST http://localhost:3000/processes/<ID>/start
```

3) Статус процесса:
```bash
curl http://localhost:3000/processes/<ID>/status
```

4) Список результатов процесса и всех процессов:
```bash
curl http://localhost:3000/processes/<ID>/results
curl http://localhost:3000/results
```

5) Сохранить файл результата (если скрипт пишет в API):
```bash
curl -X POST http://localhost:3000/processes/<ID>/results \
  -H 'Content-Type: application/json' \
  -d '{"fileName": "out.txt", "content": "hello"}'
```

Полный список эндпоинтов смотрите в `src/server.ts` и `src/process-manager-api.ts` (маршруты `/processes`, `/results`, `/scripts`, `/statistics`, `/shutdown`).

---

### Переменные окружения
- `PORT` — порт HTTP сервера (по умолчанию `3000`).
- `SCRIPTS_DIRECTORY` — директория скриптов внутри контейнера (по умолчанию `./process-scripts`).

### Настройка SCRIPTS_DIRECTORY

**Локальный запуск (без Docker):**
```bash
# По умолчанию скрипты ищутся в ./process-scripts
npm run start:api

# Или переопределить через переменную окружения
SCRIPTS_DIRECTORY=/custom/path/to/scripts npm run start:api
```

**Docker-контейнер:**
```bash
# В docker run
-e SCRIPTS_DIRECTORY=/app/scripts

# В docker-compose.yml
environment:
  - SCRIPTS_DIRECTORY=/app/scripts
```

**Важно**: 
- В Docker-контейнере `SCRIPTS_DIRECTORY` должна указывать на путь ВНУТРИ контейнера
- Том должен монтироваться на этот же путь
- Пример: `SCRIPTS_DIRECTORY=/app/scripts` + `-v ./scripts:/app/scripts`

### Важные замечания
- Скрипты запускаются под управлением PM2. Логи PM2 будут в `/app/logs` (смонтируйте наружу, если нужно сохранять).
- Для Python-скриптов добавьте интерпретатор в образ или используйте свой кастомный образ на базе данного.
- Для TypeScript-скриптов понадобится `ts-node` в контейнере или предварительная компиляция до `.js`.


