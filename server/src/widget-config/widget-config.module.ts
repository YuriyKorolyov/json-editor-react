// src/widget-config/widget-config.module.ts
import { Module } from '@nestjs/common';
import { WidgetService } from './widget-config.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientController } from '../client/client.controller';

@Module({
  imports: [PrismaModule],
  providers: [WidgetService],
  controllers: [ClientController], // Подключаем контроллер
  exports: [WidgetService],
})
export class WidgetModule {}