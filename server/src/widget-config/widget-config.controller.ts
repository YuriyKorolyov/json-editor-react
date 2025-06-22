// src/widget-config/widget-config.controller.ts
import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import { existsSync, createReadStream } from 'fs';
import { WidgetService } from '../widget-config/widget-config.service';

@Controller() // Базовый путь — корень ('/')
export class WidgetConfigController {
  constructor(private readonly widgetService: WidgetService) {}

  @Get()
  serveHomePage(@Res() res: Response) {
    const htmlContent = `
<!doctype html>
<html lang="en">
  <head>
    <script>
        function jivo_onLoadCallback() {
            console.log('Widget fully loaded'); 
            window.jsonEditorApi.setUserToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU5MGMyZjY3LTk1NDEtNGQwZC1hNmFjLTc1YTdhN2YwYzI1OCIsImlhdCI6MTc1MDI1Nzc4NiwiZXhwIjoxNzUwMzQ0MTg2fQ.UrSROAiKpVpnrWuUiw_ggencPjDme797yd4QmuBaJmw');     
        }   
    </script>
    <script defer src="https://jsonwidget.fvds.ru/dd032b7d-a2b7-42e0-b9d5-0de1ec502660"></script>
  </head>
  <body>
    <h1>Widget Integration Page</h1>
    <p>Widget is loading...</p>
  </body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  }


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
  async serveWidgetFile(
    @Param('widgetId') widgetId: string,
    @Res() res: Response,
  ) {
    // 1. Проверка формата UUID
    if (!this.isValidUUID(widgetId)) {
      return res.status(400).send('Invalid Widget ID format');
    }

    // 2. Проверка существования в БД
    const widgetExists = await this.widgetService.widgetExists(widgetId);
    if (!widgetExists) {
      return res.status(404).send('Widget not found in database');
    }

    // 3. Проверка и отдача файла
    const filePath = path.join(process.cwd(), 'public/js/load.js');
    
    if (!existsSync(filePath)) {
      return res.status(500).send('Widget script not found on server');
    }

    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    createReadStream(filePath).pipe(res);
  }

  // Вспомогательный метод для проверки UUID
  private isValidUUID(uuid: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(uuid);
  }
}