# Устанавливаем Node.js
FROM node:20

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY server/package*.json ./
COPY server/prisma ./prisma

# Устанавливаем зависимости
RUN npm install
RUN npx prisma generate
# RUN npx prisma migrate deploy

# Копируем остальной код сервера, включая public
COPY server .

# Указываем порт
EXPOSE 3000

# Команда запуска сервера
# CMD ["npm", "run", "start"]
CMD npx prisma migrate deploy && npx prisma db seed && npm run start
