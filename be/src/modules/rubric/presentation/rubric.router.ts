import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import { RubricController } from './rubric.controller.js'

export class RubricRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<RubricController>('RubricController')

        this.router.get('/rules', authenticate, asyncHandler((req, res) => ctrl.listRules(req, res)))
        this.router.get('/rules/:id', authenticate, asyncHandler((req, res) => ctrl.getRuleWithCriteria(req, res)))
    }
}
