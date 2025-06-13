// src/widget-config/widget-config.controller.ts
import { Controller, Get, Param } from '@nestjs/common'

@Controller('script/widget/config')
export class WidgetConfigController {
  @Get(':widgetId')
  getConfig(@Param('widgetId') widgetId: string) {
    // Тут можно добавить проверку widgetId в базе, если нужно
    return {
      locale: 'ru',
      build_number: '001',
      base_url: 'http://localhost:3000'
    }
  }
}
