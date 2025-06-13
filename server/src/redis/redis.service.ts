// src/redis/redis.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { createClient, RedisClientType } from 'redis'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL')
    this.client = createClient({ url })
    this.client.on('error', (err) => console.error('Redis Client Error', err))
    await this.client.connect()
  }

  getClient(): RedisClientType {
    return this.client
  }

  async onModuleDestroy() {
    await this.client.disconnect()
  }
}
