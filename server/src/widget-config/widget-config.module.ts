// src/widget/widget.module.ts
import { Module } from '@nestjs/common';
import { WidgetService } from './widget-config.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WidgetService],
  exports: [WidgetService], // Экспортируем сервис для использования в других модулях
})
export class WidgetModule {}