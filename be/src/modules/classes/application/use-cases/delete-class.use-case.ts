import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IClassRepository } from '../../domain/repositories/class.repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'

export class DeleteClassUseCase implements IUseCase<string, void> {
  constructor(private classRepository: IClassRepository) {}

  async execute(id: string): Promise<void> {
    const classEntity = await this.classRepository.findById(id)
    if (!classEntity) {
      throw new NotFoundError('Class not found')
    }

    await this.classRepository.delete(id)
  }
}
