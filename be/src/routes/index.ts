import { Router } from 'express'

import { container } from '../shared/infrastructure/di-container.js'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

// Get controllers from DI container
const authController = container.get<any>('AuthController')
const classController = container.get<any>('ClassController')
const assignmentController = container.get<any>('AssignmentController')

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auth routes (email/password)
router.post('/auth/login', asyncHandler((req: any, res: any) => authController.login(req, res)))
router.post('/auth/register', asyncHandler((req: any, res: any) => authController.register(req, res)))
router.get('/auth/me', authenticate, asyncHandler((req: any, res: any) => authController.getMe(req, res)))
router.post('/auth/logout', authenticate, asyncHandler((req: any, res: any) => authController.logout(req, res)))

// Classes routes
router.post('/classes', asyncHandler((req: any, res: any) => classController.create(req, res)))
router.get('/classes', asyncHandler((req: any, res: any) => classController.list(req, res)))
router.put('/classes/:id', authenticate, asyncHandler((req: any, res: any) => classController.update(req, res)))
router.delete('/classes/:id', authenticate, asyncHandler((req: any, res: any) => classController.delete(req, res)))

// Assignments routes
router.post('/assignments', asyncHandler((req: any, res: any) => assignmentController.create(req, res)))
router.get('/assignments', asyncHandler((req: any, res: any) => assignmentController.list(req, res)))
router.put('/assignments/:id', authenticate, asyncHandler((req: any, res: any) => assignmentController.update(req, res)))
router.delete('/assignments/:id', authenticate, asyncHandler((req: any, res: any) => assignmentController.delete(req, res)))

// Users routes (Admin management)
const usersController = container.get<any>('UsersController')
router.get('/users', authenticate, asyncHandler((req: any, res: any) => usersController.list(req, res)))
router.post('/users', authenticate, asyncHandler((req: any, res: any) => usersController.create(req, res)))
router.patch('/users/:id', authenticate, asyncHandler((req: any, res: any) => usersController.update(req, res)))
router.delete('/users/:id', authenticate, asyncHandler((req: any, res: any) => usersController.delete(req, res)))
router.patch('/users/:id/lock', authenticate, asyncHandler((req: any, res: any) => usersController.toggleLock(req, res)))

export default router
