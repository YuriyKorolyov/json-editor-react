// src/widget-config/widget-config.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WidgetService {
  constructor(private prisma: PrismaService) {}

  async widgetExists(widgetId: string): Promise<boolean> {
    const widget = await this.prisma.widget.findUnique({
      where: { id: widgetId },
    });
    return !!widget;
  }
}