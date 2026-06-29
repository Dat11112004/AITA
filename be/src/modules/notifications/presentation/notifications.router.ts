import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { NotificationsController } from './notifications.controller.js'

export class NotificationsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<NotificationsController>(TOKENS.NotificationsController)

        this.router.get('/', authenticate, asyncHandler((req, res) => ctrl.listMyNotifications(req, res)))
        this.router.put('/:id/read', authenticate, asyncHandler((req, res) => ctrl.markAsRead(req, res)))
    }
}
