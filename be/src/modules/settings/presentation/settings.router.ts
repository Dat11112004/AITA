import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import { SettingsController } from './settings.controller.js'

export class SettingsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<SettingsController>('SettingsController')

        this.router.get('/config', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.getSystemConfig(req, res)))
        this.router.put('/config', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.updateSystemConfig(req, res)))

        this.router.get('/options/classes', authenticate, asyncHandler((req, res) => ctrl.classOptions(req, res)))
        this.router.get('/options/lecturers', authenticate, asyncHandler((req, res) => ctrl.lecturerOptions(req, res)))
    }
}
