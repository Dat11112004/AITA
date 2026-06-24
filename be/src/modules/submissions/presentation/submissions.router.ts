import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import { SubmissionsController } from './submissions.controller.js'

export class SubmissionsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<SubmissionsController>('SubmissionController') // Match key in DI container

        this.router.get('/', authenticate, asyncHandler((req: any, res: any) => ctrl.list(req, res)))
        this.router.get('/recent', authenticate, asyncHandler((req: any, res: any) => ctrl.recent(req, res)))
        this.router.get('/:id', authenticate, asyncHandler((req: any, res: any) => ctrl.getOne(req, res)))
        this.router.post('/', authenticate, asyncHandler((req: any, res: any) => ctrl.submit(req, res)))
        this.router.patch('/:id/grade', authenticate, asyncHandler((req: any, res: any) => ctrl.publishGrade(req, res)))
    }
}
