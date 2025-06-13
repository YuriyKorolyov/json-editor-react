// src/json/dto/save-json.dto.ts
import { IsString, IsNotEmpty, IsObject } from 'class-validator'

export class SaveJsonDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsObject()
  data: any

  @IsObject()
  schema: any
}
