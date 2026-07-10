import type { Request, Response } from 'express'
import { CreateClassRequestDto, EnrollStudentRequestDto, UpdateClassNoteDto, UpdateClassRequestDto } from '../application/dtos/class.dto.js'
import { ListClassesUseCase } from '../application/use-cases/list-classes.use-case.js'
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case.js'
import { GetClassStudentsUseCase } from '../application/use-cases/get-class-students.use-case.js'
import { EnrollStudentUseCase } from '../application/use-cases/enroll-student.use-case.js'
import { UpdateClassNoteUseCase } from '../application/use-cases/update-class-note.use-case.js'
import { UpdateClassUseCase } from '../application/use-cases/update-class.use-case.js'
import { DeleteClassUseCase } from '../application/use-cases/delete-class.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { GetClassCodesBySubjectUseCase } from '../application/use-cases/get-class-codes-by-subject.use-case.js'
import { MESSAGES } from '../../../shared/constants/messages.js'
import { prisma } from '../../../database/prisma.js'

export class ClassesController extends BaseController {
  constructor(
    private readonly listClassesUseCase: ListClassesUseCase,
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly getClassStudentsUseCase: GetClassStudentsUseCase,
    private readonly enrollStudentUseCase: EnrollStudentUseCase,
    private readonly updateClassNoteUseCase: UpdateClassNoteUseCase,
    private readonly updateClassUseCase: UpdateClassUseCase,
    private readonly deleteClassUseCase: DeleteClassUseCase,
    private readonly getClassCodesBySubjectUseCase: GetClassCodesBySubjectUseCase,
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

  async updateNote(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Updating note for class ${classId}`)
    const dto = UpdateClassNoteDto.from(req.body)
    const result = await this.updateClassNoteUseCase.execute({ classId, dto, user: req.user! })
    this.ok(res, result, MESSAGES.CLASS_NOTE_UPDATED)
  }

  async update(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Updating class ${classId}`)
    const dto = UpdateClassRequestDto.from(req.body)
    const result = await this.updateClassUseCase.execute({ classId, dto })
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async delete(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Deleting class ${classId}`)
    await this.deleteClassUseCase.execute(classId)
    this.ok(res, null, MESSAGES.SUCCESS)
  }

  async listClassCodes(req: Request, res: Response): Promise<void> {
    const semesterCode = req.query.semesterCode as string | undefined
    const subjectCode = req.query.subjectCode as string | undefined

    this.logger.info(`Fetching class codes for semester=${semesterCode}, subject=${subjectCode}`)

    const where: any = {}

    if (semesterCode) {
      const semester = await prisma.semester.findFirst({ where: { Code: semesterCode } })
      if (semester) where.SemesterId = semester.Id
    }

    if (subjectCode) {
      const subject = await prisma.subject.findFirst({ where: { SubjectCode: subjectCode } })
      if (subject) where.SubjectId = subject.Id
    }

    const classes = await (prisma as any).class.findMany({
      where,
      select: {
        Id: true,
        ClassCode: true,
        _count: { select: { StudentClass: true } }
      },
      orderBy: { ClassCode: 'asc' }
    })

    // Deduplicate by ClassCode — keep first occurrence (DB may have multiple records with same code)
    const seenCodes = new Set<string>()
    const result = classes
      .filter((c: any) => {
        if (!c.ClassCode || seenCodes.has(c.ClassCode)) return false
        seenCodes.add(c.ClassCode)
        return true
      })
      .map((c: any) => ({
        classId: c.Id,
        classCode: c.ClassCode,
        studentCount: c._count?.StudentClass || 0
      }))

    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async listSubjectsBySemester(req: Request, res: Response): Promise<void> {
    const semesterCode = req.query.semesterCode as string | undefined

    this.logger.info(`Fetching subjects for semester=${semesterCode}`)

    const where: any = {}
    if (semesterCode) {
      const semester = await prisma.semester.findFirst({ where: { Code: semesterCode } })
      if (semester) where.SemesterId = semester.Id
    }

    const classes = await (prisma as any).class.findMany({
      where,
      select: { Subject: { select: { Id: true, SubjectCode: true, SubjectName: true } } },
      distinct: ['SubjectId']
    })

    const subjects = classes
      .map((c: any) => c.Subject)
      .filter((s: any) => s !== null)

    this.ok(res, subjects, MESSAGES.SUCCESS)
  }

  async getClassCodesBySubject(req: Request, res: Response): Promise<void> {
    const subjectId = req.params.subjectId as string
    if (!subjectId) {
      throw new Error('SubjectId is required')
    }
    this.logger.info(`Fetching class codes for subject ${subjectId}`)
    const result = await this.getClassCodesBySubjectUseCase.execute(subjectId)
    this.ok(res, result, MESSAGES.SUCCESS)
  }
}
