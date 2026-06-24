import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import { UsersController } from './users.controller.js'

export class UsersRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<UsersController>('UsersController')

        this.router.get('/', authenticate, requireRoles('ADMIN'), asyncHandler((req: any, res: any) => ctrl.list(req, res)))
        this.router.post('/', authenticate, requireRoles('ADMIN'), asyncHandler((req: any, res: any) => ctrl.create(req, res)))
        this.router.patch('/:id', authenticate, requireRoles('ADMIN'), asyncHandler((req: any, res: any) => ctrl.update(req, res)))
        this.router.delete('/:id', authenticate, requireRoles('ADMIN'), asyncHandler((req: any, res: any) => ctrl.delete(req, res)))
        this.router.patch('/:id/lock', authenticate, requireRoles('ADMIN'), asyncHandler((req: any, res: any) => ctrl.toggleLock(req, res)))
    }
}
