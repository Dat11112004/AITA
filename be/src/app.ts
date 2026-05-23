import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import apiRoutes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
  app.use(express.json({ limit: '2mb' }))

  app.use('/api', apiRoutes)

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { message: 'API không tồn tại' } })
  })

  app.use(errorHandler)
  return app
}
