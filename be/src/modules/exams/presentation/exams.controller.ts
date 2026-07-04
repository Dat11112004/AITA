import path from 'node:path'
import fs from 'node:fs'
import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { CreateExamRequestDto, UpdateExamRequestDto } from '../application/dtos/exam.dto.js'
import { ListExamsUseCase } from '../application/use-cases/list-exams.use-case.js'
import { CreateExamUseCase } from '../application/use-cases/create-exam.use-case.js'
import { UpdateExamUseCase } from '../application/use-cases/update-exam.use-case.js'
import { GetExamUseCase } from '../application/use-cases/get-exam.use-case.js'
import { UploadExamAttachmentUseCase } from '../application/use-cases/upload-exam-attachment.use-case.js'
import { ListExamAttachmentsUseCase } from '../application/use-cases/list-exam-attachments.use-case.js'
import { GetExamAttachmentUseCase } from '../application/use-cases/get-exam-attachment.use-case.js'
import { ValidationError, NotFoundError } from '../../../shared/application/app.error.js'
import { EXAM_ATTACHMENT_DIR, decodeOriginalName } from './exam-attachment-upload.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class ExamsController extends BaseController {
  constructor(
    private readonly listExamsUseCase: ListExamsUseCase,
    private readonly createExamUseCase: CreateExamUseCase,
    private readonly updateExamUseCase: UpdateExamUseCase,
    private readonly getExamUseCase: GetExamUseCase,
    private readonly uploadExamAttachmentUseCase: UploadExamAttachmentUseCase,
    private readonly listExamAttachmentsUseCase: ListExamAttachmentsUseCase,
    private readonly getExamAttachmentUseCase: GetExamAttachmentUseCase,
    private readonly logger: ILogger
  ) {
    super()
  }

  async list(req: Request, res: Response): Promise<void> {
    this.logger.debug('Received request to list exams')
    const params = {
      classId: req.query.classId,
      status: req.query.status,
      type: req.query.type,
      tab: req.query.tab,
    }
    const result = await this.listExamsUseCase.execute({ user: req.user!, params })
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.debug('Received request to create exam')
    const dto = CreateExamRequestDto.from(req.body)
    const result = await this.createExamUseCase.execute(dto)
    this.created(res, result, MESSAGES.SUCCESS)
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    this.logger.debug(`Received request to update exam: ${id}`)
    const dto = UpdateExamRequestDto.from(req.body)
    const result = await this.updateExamUseCase.execute({ id, dto })
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async getOne(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    this.logger.debug(`Received request to get exam details: ${id}`)
    const result = await this.getExamUseCase.execute(id)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async uploadAttachment(req: Request, res: Response): Promise<void> {
    const examId = req.params.id as string
    this.logger.debug(`Received attachment upload for exam: ${examId}`)
    if (!req.file) {
      throw new ValidationError(MESSAGES.EXAM_ATTACHMENT_FILE_REQUIRED)
    }
    try {
      const result = await this.uploadExamAttachmentUseCase.execute({
        examId,
        fileName: decodeOriginalName(req.file.originalname),
        fileUrl: req.file.filename,
        fileType: req.file.mimetype,
      })
      this.created(res, result, MESSAGES.EXAM_ATTACHMENT_UPLOAD_SUCCESS)
    } catch (err) {
      // Don't leave orphan files when the exam doesn't exist or the insert fails
      fs.promises.unlink(req.file.path).catch(() => {})
      throw err
    }
  }

  async listAttachments(req: Request, res: Response): Promise<void> {
    const examId = req.params.id as string
    const result = await this.listExamAttachmentsUseCase.execute(examId)
    this.ok(res, result, MESSAGES.EXAM_ATTACHMENT_LIST_SUCCESS)
  }

  async downloadAttachment(req: Request, res: Response): Promise<void> {
    const examId = req.params.id as string
    const attachmentId = req.params.attachmentId as string
    const attachment = await this.getExamAttachmentUseCase.execute({ examId, attachmentId })

    // FileUrl stores only the generated basename; refuse anything that escapes the dir
    const filePath = path.resolve(EXAM_ATTACHMENT_DIR, attachment.fileUrl ?? '')
    if (!filePath.startsWith(EXAM_ATTACHMENT_DIR) || !fs.existsSync(filePath)) {
      throw new NotFoundError(MESSAGES.EXAM_ATTACHMENT_NOT_FOUND)
    }

    await new Promise<void>((resolve, reject) => {
      res.download(filePath, attachment.fileName ?? 'attachment', (err) => (err ? reject(err) : resolve()))
    })
  }
}
