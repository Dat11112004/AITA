import type { Request, Response, NextFunction, RequestHandler } from 'express'

type Fn = (req: Request, res: Response, next: NextFunction) => Promise<void>

export const asyncHandler = (fn: Fn): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
