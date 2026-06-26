import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { Prisma } from '../../../../database/prisma.js'
import { ExamResponseDto } from '../dtos/exam.dto.js'

export class ListExamsUseCase implements IUseCase<{ user: AuthUser; params: any }, ExamResponseDto[]> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute({ user, params }: { user: AuthUser; params: any }): Promise<ExamResponseDto[]> {
    const { classId, status, type } = params

    const where: Prisma.ExamWhereInput = {}

    if (classId) where.SubjectId = classId
    if (type) where.ExamType = String(type) as any
    if (status) where.Status = String(status) as any

    let exams = await this.uow.examRepository.findMany({ where })

    // Role-based filtering
    if (user.role === 'LECTURER') {
      const classes = await this.uow.classRepository.findMany({
        where: { InstructorClass: { some: { UserId: user.id } } }
      })
      const allowedSubjectIds = new Set(classes.map((c: any) => c.Id))
      exams = exams.filter((exam: any) => allowedSubjectIds.has(exam.SubjectId))
    }

    if (user.role === 'STUDENT') {
      const enrolled = await this.uow.enrollmentRepository.findMany({ UserId: user.id })
      const ids = new Set(enrolled.map((e: any) => e.ClassId))
      exams = exams.filter((a: any) => ids.has(a.SubjectId) && a.Status === 'Published')
    }

    return exams.map(ExamResponseDto.from)
  }
}
