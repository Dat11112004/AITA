import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { IClassRepository } from '../../domain/repositories/class-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class DeleteClassUseCase implements IUseCase<string, void> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(classId: string): Promise<void> {
    const classRepo = this.uow.resolve<IClassRepository>(TOKENS.ClassRepository)

    const existingClass = await classRepo.findById(classId)
    if (!existingClass) {
      throw new NotFoundError(MESSAGES.CLASS_NOT_FOUND || 'Không tìm thấy lớp học')
    }

    return this.uow.runInTransaction(async (txn) => {
      const txClassRepo = txn.resolve<IClassRepository>(TOKENS.ClassRepository)
      await txClassRepo.delete(classId)
    })
  }
}
