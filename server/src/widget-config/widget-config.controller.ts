// src/widget-config/widget-config.controller.ts
import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import { existsSync, createReadStream } from 'fs';

@Controller() // Базовый путь — корень ('/')
export class WidgetConfigController {
  // Эндпоинт для конфигурации виджета (старый URL сохраняется)
  @Get('script/widget/config/:widgetId')
  getConfig(@Param('widgetId') widgetId: string) {
    // Проверка UUID (опционально)
    if (!this.isValidUUID(widgetId)) {
      return { error: 'Invalid Widget ID' };
    }

    // Возвращаем конфиг с динамическим URL для load.js
    return {
      locale: 'ru',
      build_number: '001',
      base_url: 'http://localhost:3000',
      // Добавляем URL для загрузки скрипта с тем же widgetId
      script_url: `http://localhost:3000/${widgetId}`
    };
  }

  // Новый эндпоинт для отдачи load.js по UUID
  @Get(':widgetId')
  serveWidgetFile(
    @Param('widgetId') widgetId: string,
    @Res() res: Response,
  ) {
    // Проверка UUID (можно вынести в отдельный метод/декоратор)
    if (!this.isValidUUID(widgetId)) {
      return res.status(400).send('Invalid Widget ID');
    }

    const filePath = path.join(__dirname, '../../../server/public/js', 'load.js');
    console.log(filePath);
    
    if (existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/javascript');
      // Добавляем заголовки кеширования (опционально)
      res.setHeader('Cache-Control', 'public, max-age=86400');
      createReadStream(filePath).pipe(res);
    } else {
      res.status(404).send('Widget file not found');
    }
  }

  // Вспомогательный метод для проверки UUID
  private isValidUUID(uuid: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(uuid);
  }
}