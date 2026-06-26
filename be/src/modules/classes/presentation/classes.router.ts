import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import type { ClassesController } from './classes.controller.js'

export class ClassesRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    const controller = container.get<ClassesController>('ClassController')

    this.router.get('/', authenticate, asyncHandler((req, res) => controller.list(req, res)))
    this.router.post('/', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.create(req, res)))
    this.router.get('/:id/students', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.getStudents(req, res)))
    this.router.post('/:id/enroll', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.enroll(req, res)))
  }
}
