// src/auth/jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const sessionId = request.headers['x-session-id']
    if (!sessionId) {
      throw new UnauthorizedException('Session ID required')
    }

    try {
      const userId = await this.authService.validateSession(sessionId)
      request.userId = userId
      return true
    } catch (e) {
      throw new UnauthorizedException(e.message)
    }
  }
}
