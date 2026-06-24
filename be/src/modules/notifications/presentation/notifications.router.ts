import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import { NotificationsController } from './notifications.controller.js'

export class NotificationsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<NotificationsController>('NotificationsController')

        this.router.get('/', authenticate, asyncHandler((req, res) => ctrl.listMyNotifications(req, res)))
        this.router.put('/:id/read', authenticate, asyncHandler((req, res) => ctrl.markAsRead(req, res)))
    }
}
