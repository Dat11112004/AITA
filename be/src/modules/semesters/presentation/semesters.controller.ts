import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { CreateSemesterUseCase } from '../application/use-cases/create-semester.use-case.js'
import { ListSemestersUseCase } from '../application/use-cases/list-semesters.use-case.js'
import { CreateSemesterRequestDto } from '../application/dtos/semester.dto.js'
import { MESSAGES } from '../../../shared/constants/messages.js'

export class SemestersController extends BaseController {
  constructor(
    private readonly listSemestersUseCase: ListSemestersUseCase,
    private readonly createSemesterUseCase: CreateSemesterUseCase,
    private readonly logger: ILogger
  ) {
    super()
  }

  async list(req: Request, res: Response): Promise<void> {
    this.logger.info(`Fetching semesters by user ${req.user!.id}`)
    const result = await this.listSemestersUseCase.execute()
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.info(`Creating new semester`)
    const dto = CreateSemesterRequestDto.from(req.body)
    const result = await this.createSemesterUseCase.execute(dto)
    this.created(res, result, MESSAGES.SUCCESS)
  }
}
