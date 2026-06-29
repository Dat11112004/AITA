import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { SettingsController } from './settings.controller.js'

export class SettingsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<SettingsController>(TOKENS.SettingsController)

        this.router.get('/', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.getSystemConfig(req, res)))
        this.router.put('/', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.updateSystemConfig(req, res)))
    }
}
