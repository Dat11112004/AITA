import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { notFound } from '../../../../utils/errors.js'

export class DeleteSubjectUseCase implements IUseCase<string, void> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(id: string): Promise<void> {
    const existing = await this.uow.subjectRepository.findById(id)
    if (!existing) {
      throw notFound('Môn học không tồn tại')
    }

    await this.uow.subjectRepository.delete(id)
  }
}
