// src/json/dto/save-json.dto.ts
import { IsNotEmpty, IsString, IsOptional, ValidateNested } from 'class-validator';

export class SaveJsonDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  data: any; // Принимает объект, массив или примитив

  @IsOptional()
  schema: any; // Опциональная схема
}