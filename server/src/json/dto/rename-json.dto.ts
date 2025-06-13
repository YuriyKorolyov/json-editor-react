// src/json/dto/rename-json.dto.ts
import { IsString, IsNotEmpty } from 'class-validator'

export class RenameJsonDto {
  @IsString()
  @IsNotEmpty()
  oldTitle: string

  @IsString()
  @IsNotEmpty()
  newTitle: string
}