import type { Request, Response } from 'express'
import { CreateAssignmentUseCase } from '../../application/use-cases/create-assignment.use-case.js'
import { ListAssignmentsUseCase } from '../../application/use-cases/list-assignments.use-case.js'
import { UpdateAssignmentUseCase } from '../../application/use-cases/update-assignment.use-case.js'
import { CreateAssignmentRequestDTO, UpdateAssignmentRequestDTO } from '../../application/dtos/assignment.dtos.js'
import { ok } from '../../../../utils/response.js'
import { logger } from '../../../../shared/infrastructure/logger.js'

export class AssignmentController {
  constructor(
    private createAssignmentUseCase: CreateAssignmentUseCase,
    private listAssignmentsUseCase: ListAssignmentsUseCase,
    private updateAssignmentUseCase: UpdateAssignmentUseCase
  ) {}

  async create(req: Request, res: Response) {
    try {
      const dto = new CreateAssignmentRequestDTO(
        req.body.classId,
        req.body.title,
        req.body.type,
        req.body.description,
        req.body.dueAt ? new Date(req.body.dueAt) : undefined,
        req.body.content,
        req.body.maxScore || 10
      )
      const result = await this.createAssignmentUseCase.execute(dto)
      ok(res, result.toJSON(), 201)
    } catch (error) {
      logger.error('Create assignment failed', error as Error)
      throw error
    }
  }

  async list(req: Request, res: Response) {
    try {
      const classId = (req.query.classId as any)?.toString() || undefined
      const result = await this.listAssignmentsUseCase.execute({ classId })
      ok(res, result)
    } catch (error) {
      logger.error('List assignments failed', error as Error)
      throw error
    }
  }

  async update(req: Request, res: Response) {
    try {
      const dto = new UpdateAssignmentRequestDTO(
        req.body.title,
        req.body.description,
        req.body.content,
        req.body.dueAt ? new Date(req.body.dueAt) : undefined,
        req.body.status
      )
      const result = await this.updateAssignmentUseCase.execute({
        id: (req.params.id as any)?.toString(),
        data: dto,
      })
      ok(res, result.toJSON())
    } catch (error) {
      logger.error('Update assignment failed', error as Error)
      throw error
    }
  }
}
