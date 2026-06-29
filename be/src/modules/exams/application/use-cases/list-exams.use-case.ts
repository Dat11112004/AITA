import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { ExamResponseDto } from '../dtos/exam.dto.js'
import type { ExamStatusValue, ExamTypeValue } from '../../domain/entities/exam.entity.js'

export class ListExamsUseCase implements IUseCase<{ user: AuthUser; params: any }, ExamResponseDto[]> {
  constructor(
    private readonly examRepo: IExamRepository,
    private readonly uow: IUnitOfWork // For legacy repo access during migration
  ) { }

  async execute({ user, params }: { user: AuthUser; params: any }): Promise<ExamResponseDto[]> {
    const { classId, status, type } = params

    // Base filter
    const filter: any = {}
    if (classId) filter.subjectId = classId
    if (type) filter.examType = String(type) as ExamTypeValue
    if (status) filter.status = String(status) as ExamStatusValue

    let exams = await this.examRepo.findMany(filter)

    // Role-based filtering (in-memory for now to reuse legacy repo logic)
    if (user.role === 'LECTURER') {
      const classes = await this.uow.resolve<any>(Symbol.for('ClassRepository')).findMany({
        where: { InstructorClass: { some: { UserId: user.id } } }
      })
      const allowedSubjectIds = new Set(classes.map((c: any) => c.Id))
      exams = exams.filter(exam => exam.subjectId && allowedSubjectIds.has(exam.subjectId))
    }

    if (user.role === 'STUDENT') {
      const enrolled: any[] = [] // dummy
      const ids = new Set(enrolled.map((e: any) => e.ClassId))
      exams = exams.filter(exam => exam.subjectId && ids.has(exam.subjectId) && exam.status === 'Published')
    }

    return exams.map(exam => ExamResponseDto.from(exam as any))
  }
}
