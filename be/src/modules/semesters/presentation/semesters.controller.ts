import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { CreateSemesterUseCase } from '../application/use-cases/create-semester.use-case.js'
import { UpdateSemesterUseCase } from '../application/use-cases/update-semester.use-case.js'
import { DeleteSemesterUseCase } from '../application/use-cases/delete-semester.use-case.js'
import { ListSemestersUseCase } from '../application/use-cases/list-semesters.use-case.js'
import { CreateSemesterRequestDto, UpdateSemesterRequestDto } from '../application/dtos/semester.dto.js'
import { MESSAGES } from '../../../shared/constants/messages.js'
import { ValidationError } from '../../../shared/application/app.error.js'

export class SemestersController extends BaseController {
  constructor(
    private readonly listSemestersUseCase: ListSemestersUseCase,
    private readonly createSemesterUseCase: CreateSemesterUseCase,
    private readonly updateSemesterUseCase: UpdateSemesterUseCase,
    private readonly deleteSemesterUseCase: DeleteSemesterUseCase,
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

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    if (typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('ID kỳ học không hợp lệ')
    }

    this.logger.info(`Updating semester ${id}`)
    const dto = UpdateSemesterRequestDto.from(req.body, id)
    const result = await this.updateSemesterUseCase.execute(dto)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    if (typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('ID kỳ học không hợp lệ')
    }

    this.logger.info(`Deleting semester ${id}`)
    await this.deleteSemesterUseCase.execute(id)
    this.noContent(res)
  }
}
