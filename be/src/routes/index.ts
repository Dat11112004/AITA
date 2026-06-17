import { Router } from 'express'
import { container } from '../shared/infrastructure/di-container.js'
import { AuthController } from '../modules/auth/presentation/controllers/auth.controller.js'
import { ClassController } from '../modules/classes/presentation/controllers/class.controller.js'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

// Get controllers from DI container
const authController = container.get<AuthController>('AuthController')
const classController = container.get<ClassController>('ClassController')

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auth routes
router.post('/auth/login', asyncHandler((req: any, res: any) => authController.login(req, res)))
router.post('/auth/register', asyncHandler((req: any, res: any) => authController.register(req, res)))
router.get('/auth/me', authenticate, asyncHandler((req: any, res: any) => authController.getMe(req, res)))

// Classes routes
router.post('/classes', asyncHandler((req: any, res: any) => classController.create(req, res)))
router.get('/classes', asyncHandler((req: any, res: any) => classController.list(req, res)))
router.put('/classes/:id', asyncHandler((req: any, res: any) => classController.update(req, res)))

export default router
