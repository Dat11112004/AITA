import type { Request, Response, NextFunction } from 'express'

/**
 * Async handler wrapper for Express routes
 * Catches async errors and forwards to error handler
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
