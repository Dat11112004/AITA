import type { Request, Response } from 'express'
import { ok } from '../../../utils/response.js'
import { Logger } from '../../../shared/infrastructure/logger.js'
import { CreateClassRequestDto, EnrollStudentRequestDto, UpdateClassNoteDto } from '../application/dtos/class.dto.js'
import { ListClassesUseCase } from '../application/use-cases/list-classes.use-case.js'
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case.js'
import { GetClassStudentsUseCase } from '../application/use-cases/get-class-students.use-case.js'
import { EnrollStudentUseCase } from '../application/use-cases/enroll-student.use-case.js'
import { UpdateClassNoteUseCase } from '../application/use-cases/update-class-note.use-case.js'

export class ClassesController {
  private readonly logger = new Logger('ClassesController')

  constructor(
    private readonly listClassesUseCase: ListClassesUseCase,
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly getClassStudentsUseCase: GetClassStudentsUseCase,
    private readonly enrollStudentUseCase: EnrollStudentUseCase,
    private readonly updateClassNoteUseCase: UpdateClassNoteUseCase
  ) { }

  async list(req: Request, res: Response): Promise<void> {
    this.logger.info(`Fetching classes for user ${req.user!.id}`)
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const result = await this.listClassesUseCase.execute({ user: req.user!, page, limit })
    ok(res, result, 200, 'Thành công')
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.info(`Creating new class`)
    const dto = CreateClassRequestDto.from(req.body)
    if (req.user!.role === 'LECTURER') {
      dto.data.lecturerId = req.user!.id
    }
    const result = await this.createClassUseCase.execute(dto)
    ok(res, result, 201, 'Tạo lớp thành công')
  }

  async getStudents(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Fetching students for class ${classId}`)
    const result = await this.getClassStudentsUseCase.execute(classId)
    ok(res, result, 200, 'Thành công')
  }

  async enroll(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Enrolling student to class ${classId}`)
    const dto = EnrollStudentRequestDto.from(req.body)
    const result = await this.enrollStudentUseCase.execute({ classId, dto, user: req.user! })
    ok(res, result, 201, 'Thêm học sinh thành công')
  }

  async updateNote(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Updating note for class ${classId}`)
    const dto = UpdateClassNoteDto.from(req.body)
    const result = await this.updateClassNoteUseCase.execute({ classId, dto, user: req.user! })
    ok(res, result, 200, 'Cập nhật ghi chú thành công')
  }
}
