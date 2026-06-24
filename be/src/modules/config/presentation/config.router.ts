import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import { ConfigController } from './config.controller.js'

export class ConfigRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<ConfigController>('ConfigController')

        this.router.get('/project-types', authenticate, asyncHandler((req, res) => ctrl.listProjectTypes(req, res)))
        this.router.get('/project-types/:code', authenticate, asyncHandler((req, res) => ctrl.getProjectType(req, res)))
        this.router.put('/project-types/:code', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.updateProjectType(req, res)))
    }
}
