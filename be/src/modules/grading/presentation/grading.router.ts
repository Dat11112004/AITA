import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { GradingController } from './grading.controller.js'

export class GradingRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<GradingController>(TOKENS.GradingController)

        this.router.get('/sessions/:sessionId', authenticate, asyncHandler((req, res) => ctrl.getSessionStatus(req, res)))
        this.router.post('/start', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => ctrl.startGrading(req, res)))
    }
}
