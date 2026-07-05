import { Router } from 'express'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import type { SemestersController } from './semesters.controller.js'

export function createSemestersRouter(controller: SemestersController): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/', requireRoles('ADMIN', 'LECTURER', 'STUDENT'), asyncHandler(controller.list.bind(controller)))
  router.post('/', requireRoles('ADMIN'), asyncHandler(controller.create.bind(controller)))
  router.patch('/:id', requireRoles('ADMIN'), asyncHandler(controller.update.bind(controller)))
  router.delete('/:id', requireRoles('ADMIN'), asyncHandler(controller.delete.bind(controller)))

  return router
}
