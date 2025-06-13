# client/Dockerfile

FROM node:20 AS builder

WORKDIR /app

COPY ./client/package*.json ./
RUN npm install

COPY ./client .
RUN npm run build

# Бандл будет в /app/dist
