import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { UserRole } from '@prisma/client'
import { env } from '../config/env.js'
import { unauthorized, forbidden } from '../utils/errors.js'
import type { AuthUser } from '../types/express.js'

interface JwtPayload {
  sub: string
  email: string
  role: UserRole
  fullName: string
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return next(unauthorized())
  try {
    const d = jwt.verify(h.slice(7), env.JWT_SECRET) as JwtPayload
    req.user = { id: d.sub, email: d.email, role: d.role, fullName: d.fullName }
    next()
  } catch {
    next(unauthorized('Token không hợp lệ'))
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized())
    if (!roles.includes(req.user.role)) return next(forbidden())
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
