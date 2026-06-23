import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { UnauthorizedError, ForbiddenError } from '../shared/application/app.error.js'
import type { AuthUser } from '../types/express.js'
import { logger } from '../shared/infrastructure/logger.js'

export interface JwtPayload {
  sub: string
  email: string
  role: string
  fullName: string
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) {
    logger.debug('Authentication failed: Missing or invalid Authorization header')
    return next(new UnauthorizedError())
  }
  
  try {
    const d = jwt.verify(h.slice(7), env.JWT_SECRET) as JwtPayload
    req.user = { id: d.sub, email: d.email, role: d.role, fullName: d.fullName }
    logger.debug('User authenticated successfully', { userId: d.sub })
    next()
  } catch (error) {
    logger.debug('Authentication failed: Token verification failed', { error })
    next(new UnauthorizedError('Token không hợp lệ'))
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn('Role authorization failed: User not authenticated')
      return next(new UnauthorizedError())
    }
    if (!roles.includes(req.user.role)) {
      logger.warn('Role authorization failed: Insufficient permissions', { 
        userId: req.user.id, 
        userRole: req.user.role, 
        requiredRoles: roles 
      })
      return next(new ForbiddenError())
    }
    next()
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, fullName: user.fullName },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  )
}
