import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { SubmissionsController } from './submissions.controller.js'

export class SubmissionsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<SubmissionsController>(TOKENS.SubmissionController)

        this.router.get('/', authenticate, asyncHandler((req: any, res: any) => ctrl.list(req, res)))
        this.router.get('/recent', authenticate, asyncHandler((req: any, res: any) => ctrl.recent(req, res)))
        this.router.post('/bulk-publish', authenticate, asyncHandler((req: any, res: any) => ctrl.bulkPublish(req, res)))
        this.router.get('/:id', authenticate, asyncHandler((req: any, res: any) => ctrl.getOne(req, res)))
        this.router.post('/', authenticate, asyncHandler((req: any, res: any) => ctrl.submit(req, res)))
        this.router.patch('/:id/grade', authenticate, asyncHandler((req: any, res: any) => ctrl.publishGrade(req, res)))
        this.router.post('/:id/feedback', authenticate, asyncHandler((req: any, res: any) => ctrl.submitFeedback(req, res)))
        this.router.get('/:id/ai-feedback', authenticate, asyncHandler((req: any, res: any) => ctrl.getAiHint(req, res)))
    }
}
