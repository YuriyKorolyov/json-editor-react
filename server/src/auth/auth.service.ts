// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import * as crypto from 'crypto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  // Проверка JWT и создание сессии
  async authenticate(token: string, widgetId: string) {
    if (!token || !widgetId) {
      throw new UnauthorizedException('Missing token or widgetId')
    }

    // 1. Проверяем виджет
    const widget = await this.prisma.widget.findUnique({ where: { id: widgetId } })
    if (!widget) {
      throw new UnauthorizedException(`Widget ${widgetId} not found`)
    }

    let payload: any
    try {
      payload = this.jwtService.verify(token, { secret: widget.secret })
    } catch {
      throw new UnauthorizedException('Invalid JWT or expired')
    }

    const userId = payload.id || payload.userId
    if (!userId) {
      throw new UnauthorizedException('Cannot extract userId from token')
    }

    // 2. Проверяем, что пользователь существует и принадлежит этому виджету
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { widget: true },
    })
    if (!user || user.widget.id !== widgetId) {
      throw new UnauthorizedException('User not linked to this widget')
    }

    // 3. Генерируем sessionId и сохраняем в Redis
    const sessionId = crypto.randomBytes(16).toString('hex')
    const redisClient = this.redisService.getClient()
    await redisClient.set(`session:${sessionId}`, user.id, { EX: 86400 })

    return { sessionId }
  }

  // Вспомогательный метод для проверки sessionId и получения userId
  async validateSession(sessionId: string): Promise<string> {
    const redisClient = this.redisService.getClient()
    const userId = await redisClient.get(`session:${sessionId}`)
    if (!userId) throw new UnauthorizedException('Session expired')
    return userId
  }
}
