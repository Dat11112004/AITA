import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { ExamResponseDto } from '../dtos/exam.dto.js'
import { Prisma } from '../../../../database/prisma.js'

export class ListExamsUseCase implements IUseCase<{ user: AuthUser; params: any }, ExamResponseDto[]> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute({ user, params }: { user: AuthUser; params: any }): Promise<ExamResponseDto[]> {
    const { classId, status, type } = params
    const where: Prisma.ExamWhereInput = {}
    
    if (classId) where.SubjectId = classId
    if (type) where.ExamType = String(type).toUpperCase() as any
    if (status) where.Status = String(status).toUpperCase() as any

    let list = await this.uow.examRepository.findMany(where)

    if (user.role === 'LECTURER') {
      const myClasses = await this.uow.classRepository.findMany({ InstructorClass: { some: { UserId: user.id } } })
      const myClassIds = myClasses.map((c: any) => c.Id)
      list = list.filter((a: any) => myClassIds.includes(a.SubjectId))
    }

    if (user.role === 'STUDENT') {
      const enrolled = await this.uow.enrollmentRepository.findMany({ UserId: user.id })
      const ids = new Set(enrolled.map((e: any) => e.ClassId))
      list = list.filter((a: any) => ids.has(a.SubjectId) && a.Status === 'Published')
    }

    return list.map(ExamResponseDto.from)
  }
}
