import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import type { ExamsController } from './exams.controller.js'

export class ExamsRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    const controller = container.get<ExamsController>('ExamController')

    this.router.get('/', authenticate, asyncHandler((req, res) => controller.list(req, res)))
    this.router.post('/', authenticate, asyncHandler((req, res) => controller.create(req, res)))
    this.router.get('/:id', authenticate, asyncHandler((req, res) => controller.getOne(req, res)))
    this.router.put('/:id', authenticate, asyncHandler((req, res) => controller.update(req, res)))
  }
}
