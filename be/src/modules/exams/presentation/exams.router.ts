import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import { examAttachmentUpload } from './exam-attachment-upload.js'
import type { ExamsController } from './exams.controller.js'

export class ExamsRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    const controller = container.get<ExamsController>(TOKENS.ExamsController)

    this.router.get('/', authenticate, asyncHandler((req, res) => controller.list(req, res)))
    this.router.post('/', authenticate, asyncHandler((req, res) => controller.create(req, res)))
    this.router.get('/:id', authenticate, asyncHandler((req, res) => controller.getOne(req, res)))
    // Put or Patch for update depending on UI needs. Keeping both for compatibility if needed, but PUT is what was there.
    this.router.put('/:id', authenticate, asyncHandler((req, res) => controller.update(req, res)))
    this.router.patch('/:id', authenticate, asyncHandler((req, res) => controller.update(req, res)))

    // Attachments (WEB-L-05): lecturer/admin upload, any authenticated user list/download
    this.router.get('/:id/attachments', authenticate, asyncHandler((req, res) => controller.listAttachments(req, res)))
    this.router.post(
      '/:id/attachments',
      authenticate,
      requireRoles('LECTURER', 'ADMIN'),
      examAttachmentUpload.single('file'),
      asyncHandler((req, res) => controller.uploadAttachment(req, res))
    )
    this.router.get('/:id/attachments/:attachmentId/download', authenticate, asyncHandler((req, res) => controller.downloadAttachment(req, res)))
  }
}
