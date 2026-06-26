import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'

export class GetClassStudentsUseCase implements IUseCase<string, any[]> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(classId: string): Promise<any[]> {
    const cls = await this.uow.classRepository.findById(classId)
    if (!cls) {
      throw new NotFoundError('Lớp không tồn tại')
    }

    const enrollments = await this.uow.enrollmentRepository.findMany({ ClassId: classId })
    return enrollments.map((e: any) => ({
      id: e.User?.Id,
      studentId: e.User?.StudentCode ?? e.User?.Id,
      name: e.User?.FullName,
      email: e.User?.Email,
      progress: '—',
      grade: '—',
    }))
  }
}
