# Устанавливаем Node.js
FROM node:20

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY server/package*.json ./
COPY server/prisma/schema.prisma ./prisma/schema.prisma
COPY server/prisma/seed.mjs ./prisma/  

# Устанавливаем зависимости
RUN npm install
RUN npx prisma generate

# Копируем остальной код сервера, включая public
COPY server .

# Запускаем seed перед стартом приложения
RUN npx prisma db seed

# Указываем порт
EXPOSE 3000

# Команда запуска сервера
CMD ["npm", "run", "start"]
