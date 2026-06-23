import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import type { AuthController } from './auth.controller.js'

export class AuthRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    const authController = container.get<AuthController>('AuthController')

    this.router.post('/login', asyncHandler((req: any, res: any) => authController.login(req, res)))
    this.router.post('/register', asyncHandler((req: any, res: any) => authController.register(req, res)))
    this.router.get('/me', authenticate, asyncHandler((req: any, res: any) => authController.getMe(req, res)))
    this.router.post('/logout', authenticate, asyncHandler((req: any, res: any) => authController.logout(req, res)))
  }
}
