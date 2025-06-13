// src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post()
  async login(@Body() dto: LoginDto) {
    return this.authService.authenticate(dto.token, dto.widgetId)
  }
}
