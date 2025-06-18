// src/widget-config/widget-config.module.ts
import { Module } from '@nestjs/common';
import { WidgetService } from './widget-config.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientController } from '../client/client.controller';
import { AuthModule } from '../auth/auth.module'; // Добавляем импорт

@Module({
  imports: [PrismaModule, AuthModule], // Добавляем AuthModule
  providers: [WidgetService],
  controllers: [ClientController],
  exports: [WidgetService],
})
export class WidgetModule {}