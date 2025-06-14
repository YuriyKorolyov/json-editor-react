// src/json/dto/save-json.dto.ts
import { IsString, IsNotEmpty, IsJSON } from 'class-validator'

export class SaveJsonDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsJSON() 
  data: any

  @IsJSON() 
  schema: any
}
