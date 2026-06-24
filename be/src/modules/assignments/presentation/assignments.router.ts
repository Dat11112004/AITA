import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import { AssignmentsController } from './assignments.controller.js'

export class AssignmentsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<AssignmentsController>('AssignmentsController')

        this.router.get('/', authenticate, asyncHandler((req: any, res: any) => ctrl.list(req, res)))
        this.router.get('/:id', authenticate, asyncHandler((req: any, res: any) => ctrl.getOne(req, res)))
        this.router.post('/', authenticate, asyncHandler((req: any, res: any) => ctrl.create(req, res)))
        this.router.put('/:id', authenticate, asyncHandler((req: any, res: any) => ctrl.update(req, res)))
    }
}
