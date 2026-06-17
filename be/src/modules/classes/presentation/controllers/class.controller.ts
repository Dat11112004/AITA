import type { Request, Response } from 'express'
import { CreateClassUseCase } from '../../application/use-cases/create-class.use-case.js'
import { ListClassesUseCase } from '../../application/use-cases/list-classes.use-case.js'
import { UpdateClassUseCase } from '../../application/use-cases/update-class.use-case.js'
import { CreateClassRequestDTO, UpdateClassRequestDTO } from '../../application/dtos/class.dtos.js'
import { ok } from '../../../../utils/response.js'
import { logger } from '../../../../shared/infrastructure/logger.js'

export class ClassController {
  constructor(
    private createClassUseCase: CreateClassUseCase,
    private listClassesUseCase: ListClassesUseCase,
    private updateClassUseCase: UpdateClassUseCase
  ) {}

  async create(req: Request, res: Response) {
    try {
      const dto = new CreateClassRequestDTO(
        req.body.code,
        req.body.name,
        req.body.subject,
        req.body.semester,
        req.body.lecturerId,
        req.body.campus,
        req.body.schedule
      )
      const result = await this.createClassUseCase.execute(dto)
      ok(res, result.toJSON(), 201)
    } catch (error) {
      logger.error('Create class failed', error as Error)
      throw error
    }
  }

  async list(req: Request, res: Response) {
    try {
      const lecturerId = (req.query.lecturerId as any)?.toString() || undefined

      const result = await this.listClassesUseCase.execute({
        lecturerId,
      })
      ok(res, result)
    } catch (error) {
      logger.error('List classes failed', error as Error)
      throw error
    }
  }

  async update(req: Request, res: Response) {
    try {
      const dto = new UpdateClassRequestDTO(
        req.body.name,
        req.body.subject,
        req.body.semester,
        req.body.campus,
        req.body.schedule
      )
      const result = await this.updateClassUseCase.execute({
        id: (req.params.id as any)?.toString(),
        data: dto,
      })
      ok(res, result.toJSON())
    } catch (error) {
      logger.error('Update class failed', error as Error)
      throw error
    }
  }
}
