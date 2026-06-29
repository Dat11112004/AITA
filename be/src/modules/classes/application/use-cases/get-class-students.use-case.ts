import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IClassRepository } from '../../domain/repositories/class-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class GetClassStudentsUseCase implements IUseCase<string, any[]> {
  constructor(
    private readonly classRepo: IClassRepository,
    private readonly uow: IUnitOfWork
  ) {}

  async execute(classId: string): Promise<any[]> {
    const cls = await this.classRepo.findById(classId)
    if (!cls) {
      throw new NotFoundError(MESSAGES.CLASS_NOT_FOUND)
    }

    const enrollmentRepo = { findMany: async (_f: any) => [] } // dummy
    const enrollments = await enrollmentRepo.findMany({ ClassId: classId })
    const studentIds = enrollments.map((e: any) => e.UserId)

    if (studentIds.length === 0) return []

    const userRepo = this.uow.resolve<any>(Symbol.for('UserRepository'))
    const students = await userRepo.findMany({ Id: { in: studentIds } })

    return students.map((s: any) => ({
      id: s.Id,
      studentId: s.StudentCode ?? s.Id,
      name: s.FullName,
      email: s.Email,
      progress: '—',
      grade: '—',
    }))
  }
}
