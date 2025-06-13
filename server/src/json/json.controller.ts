// src/json/json.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common'
import { JsonService } from './json.service'
import { JwtGuard } from '../auth/jwt.guard'
import { SaveJsonDto } from './dto/save-json.dto'
import { RenameJsonDto } from './dto/rename-json.dto'

@Controller('api')
export class JsonController {
  constructor(private jsonService: JsonService) {}

  // Сохраняем JSON + Schema
  @UseGuards(JwtGuard)
  @Post('save')
  saveJson(@Req() req, @Body() dto: SaveJsonDto) {
    return this.jsonService.saveJson(req.userId, dto.title, dto.data, dto.schema)
  }

  // Получаем JSON + Schema по заголовку
  @UseGuards(JwtGuard)
  @Get('get-json/:title')
  getJson(@Req() req, @Param('title') title: string) {
    return this.jsonService.getJson(req.userId, title)
  }

  // Список заголовков
  @UseGuards(JwtGuard)
  @Get('list-json-titles')
  listTitles(@Req() req) {
    return this.jsonService.listTitles(req.userId)
  }

  // Переименование
  @UseGuards(JwtGuard)
  @Post('rename-json')
  renameJson(@Req() req, @Body() dto: RenameJsonDto) {
    return this.jsonService.renameJson(req.userId, dto.oldTitle, dto.newTitle)
  }

  // Удаляем
  @UseGuards(JwtGuard)
  @Delete('delete-json/:title')
  deleteJson(@Req() req, @Param('title') title: string) {
    return this.jsonService.deleteJson(req.userId, title)
  }
}
