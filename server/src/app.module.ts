// src/app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { JsonModule } from './json/json.module'
import { WidgetConfigController } from './widget-config/widget-config.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,               // доступен во всех модулях
      envFilePath: '.env',          // файл находится в server/.env
    }),
    PrismaModule,
    AuthModule,
    JsonModule,
  ],
  controllers: [WidgetConfigController],
})
export class AppModule {}
