import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../shared/application/app.error.js'
import { logger } from '../shared/infrastructure/logger.js'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error('Request error', err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    })
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: err.flatten(),
      },
    })
  }

  console.error(err)
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Lỗi hệ thống' : String(err),
    },
  })
}
