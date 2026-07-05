import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'
import { NotFoundError, ConflictError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class DeleteSemesterUseCase implements IUseCase<string, void> {
  constructor(private readonly semesterRepo: ISemesterRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.semesterRepo.findById(id)
    if (!existing) {
      throw new NotFoundError(MESSAGES.SEMESTER_NOT_FOUND || 'Không tìm thấy kỳ học')
    }

    try {
      await this.semesterRepo.delete(id)
    } catch (e: any) {
      if (e.code === 'P2003') { // Prisma Foreign Key constraint
        throw new ConflictError('Không thể xóa kỳ học đã có lớp học. Hãy xóa các lớp học trước.')
      }
      throw e
    }
  }
}
