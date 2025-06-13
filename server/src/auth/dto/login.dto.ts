// src/auth/dto/login.dto.ts
import { IsString } from 'class-validator'

export class LoginDto {
  @IsString()
  token: string

  @IsString()
  widgetId: string
}
