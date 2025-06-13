// src/main.ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { NestExpressApplication } from '@nestjs/platform-express'
import { ValidationPipe } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'
import * as path from 'path'
import { Request, Response, NextFunction } from 'express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Middleware для логирования запросов
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
    next()
  })

  app.use(cookieParser())

  // Middleware для логирования статических файлов
  const staticMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const filePath = path.join(__dirname, '..', 'public', req.url)
    console.log(`Checking static file: ${filePath}`)
    next()
  }

  app.useStaticAssets(path.join(__dirname, '..', 'public'), {
    setHeaders: (res, path) => {
      console.log(`Serving static file: ${path}`)
    }
  })

  app.enableCors({ origin: '*', credentials: true })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  await app.listen(process.env.SERVER_PORT || 3000)
  console.log(`🚀 JSON Widget Server running on http://localhost:${process.env.SERVER_PORT || 3000}`)
}
bootstrap()