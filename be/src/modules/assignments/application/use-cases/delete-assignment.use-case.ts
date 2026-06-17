import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IAssignmentRepository } from '../../domain/repositories/assignment.repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'

export class DeleteAssignmentUseCase implements IUseCase<string, void> {
  constructor(private assignmentRepository: IAssignmentRepository) {}

  async execute(id: string): Promise<void> {
    const assignment = await this.assignmentRepository.findById(id)
    if (!assignment) {
      throw new NotFoundError('Assignment not found')
    }

    await this.assignmentRepository.delete(id)
  }
}
