.PHONY: help build run stop logs clean test

# Переменные
SERVICE_NAME = process-manager-api
IMAGE_NAME = xok-process-manager-process-manager-api

help: ## Показать справку
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Собрать Docker образ
	docker-compose build

run: ## Запустить сервис
	docker-compose up -d

dev: ## Запустить в режиме разработки с логами
	docker-compose up

stop: ## Остановить сервис
	docker-compose down

restart: ## Перезапустить сервис
	docker-compose restart

logs: ## Показать логи
	docker-compose logs -f

status: ## Показать статус контейнеров
	docker-compose ps

health: ## Проверить health check
	@echo "Проверка health check..."
	@curl -s http://localhost:3000/health | jq . || echo "API недоступен"

clean: ## Очистить все контейнеры и образы
	docker-compose down --rmi all -v
	docker system prune -f

test-api: ## Протестировать API
	@echo "Тестирование API..."
	@curl -s http://localhost:3000/health | jq . || echo "Health check не работает"
	@curl -s http://localhost:3000/processes | jq . || echo "API процессов не работает"

full-setup: ## Полная настройка и запуск
	@echo "🚀 Полная настройка Process Manager API..."
	@mkdir -p process-results logs
	@make build
	@make run
	@echo "⏳ Ожидание запуска сервиса..."
	@sleep 10
	@make status
	@make health
	@echo "✅ Готово! API доступен по адресу: http://localhost:3000"
