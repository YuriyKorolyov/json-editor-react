// src/client/client.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WidgetService } from '../widget-config/widget-config.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateWidgetDto } from '../widget-config/dto/create-widget.dto';
import { SessionGuard } from '../auth/jwt.guard';

@Controller('api') // Базовый путь /api
export class ClientController {
  constructor(private readonly widgetService: WidgetService) {}

  // Регистрация клиента (требует авторизации)
  @Post('client')
  @UseGuards(SessionGuard)
  async createClient(@Body() dto: CreateClientDto) {
    return this.widgetService.createClient(dto.name);
  }

  // Регистрация виджета (требует авторизации)
  @Post('widget')
  @UseGuards(SessionGuard)
  async createWidget(@Body() dto: CreateWidgetDto) {
    return this.widgetService.createWidget(dto.clientId, dto.name);
  }
}