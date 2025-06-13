// src/json/json.module.ts
import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { JsonController } from './json.controller'
import { JsonService } from './json.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [JsonController],
  providers: [JsonService],
})
export class JsonModule {}
