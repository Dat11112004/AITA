import type { Request, Response } from 'express'
import { CreateClassRequestDto, EnrollStudentRequestDto } from '../application/dtos/class.dto.js'
import { ListClassesUseCase } from '../application/use-cases/list-classes.use-case.js'
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case.js'
import { GetClassStudentsUseCase } from '../application/use-cases/get-class-students.use-case.js'
import { EnrollStudentUseCase } from '../application/use-cases/enroll-student.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { MESSAGES } from '../../../shared/constants/messages.js'

export class ClassesController extends BaseController {
  constructor(
    private readonly listClassesUseCase: ListClassesUseCase,
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly getClassStudentsUseCase: GetClassStudentsUseCase,
    private readonly enrollStudentUseCase: EnrollStudentUseCase,
    private readonly logger: ILogger
  ) {
    super()
  }

  async list(req: Request, res: Response): Promise<void> {
    this.logger.info(`Fetching classes for user ${req.user!.id}`)
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const result = await this.listClassesUseCase.execute({ user: req.user!, page, limit })
    this.ok(res, result, MESSAGES.CLASS_LIST_SUCCESS)
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.info(`Creating new class`)
    const dto = CreateClassRequestDto.from(req.body)
    if (req.user!.role === 'LECTURER') {
      dto.data.lecturerId = req.user!.id
    }
    const result = await this.createClassUseCase.execute(dto)
    this.created(res, result, MESSAGES.CLASS_CREATE_SUCCESS)
  }

  async getStudents(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Fetching students for class ${classId}`)
    const result = await this.getClassStudentsUseCase.execute(classId)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async enroll(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Enrolling student to class ${classId}`)
    const dto = EnrollStudentRequestDto.from(req.body)
    const result = await this.enrollStudentUseCase.execute({ classId, dto, user: req.user! })
    this.created(res, result, MESSAGES.SUCCESS)
  }
}
