import type { Request, Response } from 'express'
import { ApiResponse } from '../../../shared/presentation/api-response.js'
import { Logger } from '../../../shared/infrastructure/logger.js'
import { CreateClassRequestDto, EnrollStudentRequestDto } from '../application/dtos/class.dto.js'
import { ListClassesUseCase } from '../application/use-cases/list-classes.use-case.js'
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case.js'
import { GetClassStudentsUseCase } from '../application/use-cases/get-class-students.use-case.js'
import { EnrollStudentUseCase } from '../application/use-cases/enroll-student.use-case.js'

export class ClassesController {
  private readonly logger = new Logger('ClassesController')

  constructor(
    private readonly listClassesUseCase: ListClassesUseCase,
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly getClassStudentsUseCase: GetClassStudentsUseCase,
    private readonly enrollStudentUseCase: EnrollStudentUseCase
  ) { }

  async list(req: Request, res: Response): Promise<void> {
    this.logger.info(`Fetching classes for user ${req.user!.id}`)
    const result = await this.listClassesUseCase.execute(req.user!)
    res.status(200).json(ApiResponse.success('Thành công', result))
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.info(`Creating new class`)
    const dto = CreateClassRequestDto.from(req.body)
    const result = await this.createClassUseCase.execute(dto)
    res.status(201).json(ApiResponse.success('Tạo lớp thành công', result, 201))
  }

  async getStudents(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Fetching students for class ${classId}`)
    const result = await this.getClassStudentsUseCase.execute(classId)
    res.status(200).json(ApiResponse.success('Thành công', result))
  }

  async enroll(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Enrolling student to class ${classId}`)
    const dto = EnrollStudentRequestDto.from(req.body)
    const result = await this.enrollStudentUseCase.execute({ classId, dto, user: req.user! })
    res.status(201).json(ApiResponse.success('Thêm học sinh thành công', result, 201))
  }
}
