// src/main.ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { NestExpressApplication } from '@nestjs/platform-express' // ← добавь
import { ValidationPipe } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'
import * as path from 'path'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.use(cookieParser())

  app.useStaticAssets(path.join(__dirname, '..', 'public')) // server/public
  app.useStaticAssets(path.join(__dirname, '..', 'dist/widget'), {
    prefix: '/js',
  })

  app.enableCors({ origin: '*', credentials: true })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  await app.listen(process.env.SERVER_PORT || 3000)
  console.log(`🚀 JSON Widget Server running on http://localhost:${process.env.SERVER_PORT || 3000}`)
}
bootstrap()
