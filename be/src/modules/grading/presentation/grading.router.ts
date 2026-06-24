import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import { GradingController } from './grading.controller.js'

export class GradingRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<GradingController>('GradingController')

        this.router.get('/sessions/:sessionId', authenticate, asyncHandler((req, res) => ctrl.getSessionStatus(req, res)))
        this.router.post('/start', authenticate, requireRoles('ADMIN', 'TEACHER'), asyncHandler((req, res) => ctrl.startGrading(req, res)))
    }
}
