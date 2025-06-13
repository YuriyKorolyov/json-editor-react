// server/prisma/seed.mjs
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

const prisma = new PrismaClient()

async function main() {
  console.log('⚙️ Запуск seed...')

  const clientId = '053ab079-cf59-4f42-bfac-cf2622738088'
  const widgetId = 'dd032b7d-a2b7-42e0-b9d5-0de1ec502660'
  const userId = '590c2f67-9541-4d0d-a6ac-75a7a7f0c258'
  const schemaId = 'd0fc2799-7586-469a-88d2-d5807ad0f8b7'
  const documentId = 'd51fae3d-a7fb-4514-8a0f-55cfc5bd8ba0' 

  // 1. Client
  const client = await prisma.client.upsert({
    where: { id: clientId },
    update: { isEnabled: true },
    create: {
      id: clientId,
      name: 'Test Client',
      isEnabled: true,
    },
  })

  // 2. Widget
  const widget = await prisma.widget.upsert({
    where: { id: widgetId },
    update: { isEnabled: true },
    create: {
      id: widgetId,
      name: 'Main Widget',
      secret: 'X|h"33)Kn%19VejL2~4-5c3!Sm6:%[<,XCg[6=Iun0z',
      clientId: client.id,
      isEnabled: true,
    },
  })

  // 3. User
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' }, // Используем email как уникальный идентификатор
    update: { isEnabled: true },
    create: {
      id: userId,
      name: 'Test User',
      email: 'test@example.com',
      widgetId: widget.id,
      isEnabled: true,
    },
  })

  // 4. Schema
  const schema = await prisma.jsonSchema.upsert({
    where: { id: schemaId },
    update: {
      updatedAt: new Date(),
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        required: ['message'],
      },
    },
    create: {
      id: schemaId,
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        required: ['message'],
      },
      userId: user.id,
      updatedAt: new Date(),
    },
  })

  // 5. Document
  const document = await prisma.jsonDocument.upsert({
    where: { id: documentId },
    update: {
      title: 'Example JSON (updated)',
      data: { message: 'Hello again!' },
    },
    create: {
      id: documentId,
      title: 'Example JSON',
      data: { message: 'Hello, world!' },
      userId: user.id,
      schemaId: schema.id,
    },
  })

  // 6. JWT
  const token = jwt.sign({ id: user.id }, widget.secret, { expiresIn: '1d' })

  console.log('✅ Seed завершён')
  console.log(`👤 Пользователь ID: ${user.id}`)
  console.log(`📄 Документ ID: ${document.id}`)
  console.log(`📐 Схема ID: ${schema.id}`)
  console.log(`🔑 JWT токен: ${token}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
