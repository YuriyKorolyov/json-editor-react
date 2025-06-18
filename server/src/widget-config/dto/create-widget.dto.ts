// src/widget/dto/create-widget.dto.ts
export class CreateWidgetDto {
  name: string;     // Название виджета
  clientId: string; // UUID клиента (из БД)
}