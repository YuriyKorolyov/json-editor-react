// src/json/json.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class JsonService {
  constructor(private prisma: PrismaService) {}

  async saveJson(userId: string, title: string, data: any, schema: any) {
    if (!title || !data || !schema) {
      throw new BadRequestException('Missing title, data, or schema')
    }

    const existing = await this.prisma.jsonDocument.findUnique({
      where: { userId_title: { userId, title } },
      include: { schema: true },
    })

    if (existing) {
      await this.prisma.jsonDocument.update({
        where: { userId_title: { userId, title } },
        data: {
          data,
          schema: {
            update: { schema },
          },
        },
      })
    } else {
      await this.prisma.jsonDocument.create({
        data: {
          title,
          data,
          user: { connect: { id: userId } },
          schema: {
            create: {
              schema,
              user: { connect: { id: userId } },
            },
          },
        },
      })
    }
    return { success: true }
  }

  async getJson(userId: string, title: string) {
    const doc = await this.prisma.jsonDocument.findUnique({
      where: { userId_title: { userId, title } },
      include: { schema: true },
    })
    if (!doc) throw new NotFoundException('Document not found')
    return { json: doc.data, schema: doc.schema?.schema || null }
  }

  async listTitles(userId: string) {
    return this.prisma.jsonDocument.findMany({
      where: { userId },
      select: { title: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async renameJson(userId: string, oldTitle: string, newTitle: string) {
    const existing = await this.prisma.jsonDocument.findUnique({
      where: { userId_title: { userId, title: oldTitle } },
    })
    if (!existing) throw new NotFoundException('Document not found')

    await this.prisma.jsonDocument.update({
      where: { userId_title: { userId, title: oldTitle } },
      data: { title: newTitle },
    })
    return { success: true }
  }

  async deleteJson(userId: string, title: string) {
    const doc = await this.prisma.jsonDocument.findUnique({
      where: { userId_title: { userId, title } },
      include: { schema: true },
    })
    if (!doc) throw new NotFoundException('Document not found')

    // Удаляем связанную схему (если есть)
    if (doc.schemaId) {
      await this.prisma.jsonSchema.delete({ where: { id: doc.schemaId } })
    }
    // Удаляем сам документ
    await this.prisma.jsonDocument.delete({
      where: { userId_title: { userId, title } },
    })
    return { success: true }
  }
}
