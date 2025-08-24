# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем все зависимости (включая dev для TypeScript)
RUN npm ci

# Устанавливаем PM2 глобально для доступа к CLI командам
RUN npm install -g pm2

# Копируем исходный код
COPY src/ ./src/
COPY tsconfig.json ./

# Копируем пример скрипта для тестирования
COPY example-script.js ./

# Компилируем TypeScript
RUN npm run build || tsc

# Удаляем исходные TypeScript файлы и node_modules
RUN rm -rf src/ tsconfig.json node_modules/

# Переустанавливаем только production зависимости
RUN npm ci --only=production

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Меняем владельца файлов
RUN chown -R nodejs:nodejs /app
USER nodejs

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/server.js"]
