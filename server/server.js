import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
app.use(cors())

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
app.use('/js', express.static(path.join(__dirname, 'dist/widget')))

// Отдаём загрузчик load.js
app.use('/', express.static(path.join(__dirname, 'public')))

app.listen(PORT, () => {
  console.log(`🚀 JSON Widget Server running at http://localhost:${PORT}`)
})
