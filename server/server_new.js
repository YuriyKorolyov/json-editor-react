import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import redis from 'redis';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.SERVER_PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function verifyToken(token, widgetId) {
  try {
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
    });

    if (!widget) {
      console.warn(`❌ Виджет ${widgetId} не найден`);
      return null;
    }

    const payload = jwt.verify(token, widget.secret);
    return payload.id || payload.userId || null;
  } catch (err) {
    console.error(`❌ JWT ошибка: ${err.message}`);
    return null;
  }
}

app.post('/auth', async (req, res) => {
  const { token, widgetId } = req.body;

  if (!token || !widgetId) {
    return res.status(400).json({ error: 'Missing token or widgetId' });
  }

  const userId = await verifyToken(token, widgetId);

  if (!userId) {
    return res.status(401).json({ error: 'Invalid token or widget' });
  }

  // проверим, что пользователь существует и принадлежит этому виджету
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { widget: true },
  });

  if (!user || user.widget.id !== widgetId) {
    return res.status(403).json({ error: 'User not linked to this widget' });
  }

  const sessionId = crypto.randomBytes(16).toString('hex');
  await redisClient.set(`session:${sessionId}`, user.id, { EX: 86400 });

  res.json({ sessionId });
});

async function checkSession(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) return res.status(401).json({ error: 'Session ID required' });

  const userId = await redisClient.get(`session:${sessionId}`);
  if (!userId) return res.status(401).json({ error: 'Session expired' });

  req.userId = userId;
  next();
}

app.post('/api/save', checkSession, async (req, res) => {
  const { title, data, schema } = req.body;
  const userId = req.userId;

  if (!title || !data || !schema) {
    return res.status(400).json({ error: 'Missing title, data, or schema' });
  }

  try {
    const existing = await prisma.jsonDocument.findUnique({
      where: {
        userId_title: {
          userId,
          title
        }
      },
      include: {
        schema: true
      }
    });

    if (existing) {
      // Обновляем JSON и связанную схему
      await prisma.jsonDocument.update({
        where: {
          userId_title: {
            userId,
            title,
          },
        },
        data: {
          data,
          schema: {
            update: {
              schema: schema, 
            },
          },
        },
      });
    } else {
      // Создаём новую связку JSON + Schema
      const created = await prisma.jsonDocument.create({
        data: {
          title,
          data,
          user: {
            connect: { id: userId },
          },
          schema: {
            create: {
              schema, 
              user: {
                connect: { id: userId },
              },
            },
          },
        },
        include: {
          schema: true,
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error saving JSON and schema:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/get-json/:title', checkSession, async (req, res) => {
  const { title } = req.params;
  const userId = req.userId;

  try {
    const document = await prisma.jsonDocument.findUnique({
      where: {
        userId_title: {
          userId,
          title,
        },
      },
      include: {
        schema: true, // ← подгружаем связанную JSON Schema
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    //console.log(document.title);
    res.json({
      json: document.data,
      schema: document.schema?.schema || null, // если схема есть — вернётся, иначе null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/list-json-titles', checkSession, async (req, res) => {
  try {
    const documents = await prisma.jsonDocument.findMany({
      where: { userId: req.userId },
      select: {
        title: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      }
    });

    res.json(documents);
  } catch (err) {
    console.error('Error fetching document titles:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/rename-json', checkSession, async (req, res) => {
  const { oldTitle, newTitle } = req.body;
  const userId = req.userId;

  if (!oldTitle || !newTitle) {
    return res.status(400).json({ error: 'Both oldTitle and newTitle are required' });
  }

  try {
    const existing = await prisma.jsonDocument.findUnique({
      where: {
        userId_title: {
          userId,
          title: oldTitle
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await prisma.jsonDocument.update({
      where: {
        userId_title: {
          userId,
          title: oldTitle
        }
      },
      data: {
        title: newTitle
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Rename error:', err);
    res.status(500).json({ error: 'Failed to rename document' });
  }
});

app.delete('/api/delete-json/:title', checkSession, async (req, res) => {
  const { title } = req.params;
  const userId = req.userId;

  try {
    // Найти документ с привязанной схемой
    const doc = await prisma.jsonDocument.findUnique({
      where: {
        userId_title: {
          userId,
          title
        }
      },
      include: {
        schema: true // подключаем схему
      }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Удалить связанную схему (если есть)
    if (doc.schemaId) {
      await prisma.jsonSchema.delete({
        where: { id: doc.schemaId }
      });
    }
    else {

      // Удалить сам документ
      await prisma.jsonDocument.delete({
        where: {
          userId_title: {
            userId,
            title
          }
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete document and schema' });
  }
});

// Отдаём конфиг для загрузчика
app.get('/script/widget/config/:widgetId', (req, res) => {
  const widgetId = req.params.widgetId

  // Примерно такой JSON ожидает load.js
  res.json({
    locale: 'ru',
    build_number: '001',
    base_url: 'http://localhost:3000' // важно!
  })
})

// Отдаём бандл
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// Отдаём загрузчик load.js
app.use('/', express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`🚀 JSON Widget Server running at http://localhost:${PORT}`)
})
