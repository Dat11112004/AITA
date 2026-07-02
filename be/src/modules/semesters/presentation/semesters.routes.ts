import { Router } from 'express'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import type { SemestersController } from './semesters.controller.js'

export function createSemestersRouter(controller: SemestersController): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/', requireRoles('ADMIN', 'LECTURER', 'STUDENT'), asyncHandler(controller.list.bind(controller)))
  router.post('/', requireRoles('ADMIN'), asyncHandler(controller.create.bind(controller)))

  return router
}
