import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { CreateExamRequestDto, UpdateExamRequestDto } from '../application/dtos/exam.dto.js'
import { ListExamsUseCase } from '../application/use-cases/list-exams.use-case.js'
import { CreateExamUseCase } from '../application/use-cases/create-exam.use-case.js'
import { UpdateExamUseCase } from '../application/use-cases/update-exam.use-case.js'
import { GetExamUseCase } from '../application/use-cases/get-exam.use-case.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class ExamsController extends BaseController {
  constructor(
    private readonly listExamsUseCase: ListExamsUseCase,
    private readonly createExamUseCase: CreateExamUseCase,
    private readonly updateExamUseCase: UpdateExamUseCase,
    private readonly getExamUseCase: GetExamUseCase,
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
}
