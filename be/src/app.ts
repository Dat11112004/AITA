import express from 'express'
import path from 'path'
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
  // Accept both :5173 and :5174 for frontend dev
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // :8081 = Expo/Metro web (mobile app reviewed in the browser)
      const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:8081']
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('CORS not allowed'))
      }
    },
    credentials: true
  }
  app.use(cors(corsOptions))
  app.use(requestLogger)
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: true }))
  // Uploaded avatars/attachments are fetched by the web client (:5173) and the Expo web build
  // (:8081), i.e. from a different origin than this API. helmet() defaults
  // Cross-Origin-Resource-Policy to same-origin, which made the browser download the image and
  // then refuse to render it (ERR_BLOCKED_BY_RESPONSE.NotSameOrigin) — the upload looked like
  // it silently failed. These are public static files, so opt this path out.
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      next()
    },
    express.static(path.join(process.cwd(), 'uploads')),
  )

  app.use('/api', routeManager.getRouter())

  app.use((_req, res) => {
    res.status(404).json(ApiResponse.error('API không tồn tại', 404))
  })

  app.use(errorHandler)
  return app
}

