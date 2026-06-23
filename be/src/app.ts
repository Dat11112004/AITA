import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { routeManager } from './shared/presentation/route-manager.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/request-logger.js'
import { ApiResponse } from './shared/presentation/api-response.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
  app.use(requestLogger)
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
  app.use(express.json({ limit: '2mb' }))

  app.use('/api', routeManager.getRouter())

  app.use((_req, res) => {
    res.status(404).json(ApiResponse.error('API không tồn tại', 404))
  })

  app.use(errorHandler)
  return app
}

