// src/widget-config/widget-config.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WidgetService {
  constructor(private prisma: PrismaService) {}

  // Проверка существования виджета (было)
  async widgetExists(widgetId: string): Promise<boolean> {
    const widget = await this.prisma.widget.findUnique({
      where: { id: widgetId },
    });
    return !!widget;
  }

  // Создание клиента (новое)
  async createClient(name: string): Promise<{ id: string }> {
    const client = await this.prisma.client.create({
      data: { name },
    });
    return { id: client.id }; // Возвращаем UUID клиента
  }

  // Создание виджета (новое)
  async createWidget(clientId: string, name: string): Promise<{ id: string; secret: string }> {
    const widget = await this.prisma.widget.create({
      data: {
        name,
        clientId,
        secret: this.generateSecret(), // Генерация секретного ключа
      },
    });
    return { 
      id: widget.id,      // UUID виджета
      secret: widget.secret // Секрет для доступа
    };
  }

  // Генерация случайного секрета (приватный метод)
  private generateSecret(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}