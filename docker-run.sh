#!/bin/bash

# Скрипт для запуска Process Manager API в Docker

echo "🚀 Запуск Process Manager API в Docker..."

# Проверяем, установлен ли Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Пожалуйста, установите Docker."
    exit 1
fi

# Проверяем, запущен ли Docker daemon
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon не запущен. Пожалуйста, запустите Docker."
    exit 1
fi

# Создаем необходимые директории
mkdir -p process-results logs scripts

# Собираем и запускаем контейнер
echo "📦 Сборка Docker образа..."
docker-compose up --build -d

# Ждем запуска сервиса
echo "⏳ Ожидание запуска сервиса..."
sleep 10

# Проверяем статус
if docker-compose ps | grep -q "Up"; then
    echo "✅ Process Manager API успешно запущен!"
    echo "🌐 API доступен по адресу: http://localhost:3000"
    echo "🔍 Health check: http://localhost:3000/health"
    echo ""
    echo "📋 Полезные команды:"
    echo "  Просмотр логов: docker-compose logs -f"
    echo "  Остановка: docker-compose down"
    echo "  Перезапуск: docker-compose restart"
else
    echo "❌ Ошибка запуска сервиса"
    docker-compose logs
    exit 1
fi
