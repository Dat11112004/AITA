import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IAssignmentRepository } from '../../domain/repositories/assignment.repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { UpdateAssignmentRequestDTO, AssignmentResponseDTO } from '../dtos/assignment.dtos.js'

export class UpdateAssignmentUseCase implements IUseCase<{ id: string; data: UpdateAssignmentRequestDTO }, AssignmentResponseDTO> {
  constructor(private assignmentRepository: IAssignmentRepository) {}

  async execute(input: { id: string; data: UpdateAssignmentRequestDTO }): Promise<AssignmentResponseDTO> {
    const assignment = await this.assignmentRepository.findById(input.id)
    if (!assignment) {
      throw new NotFoundError('Assignment not found')
    }

    if (input.data.title || input.data.description !== undefined || input.data.content !== undefined) {
      assignment.updateBasicInfo(
        input.data.title || assignment.title,
        input.data.description !== undefined ? input.data.description : assignment.description,
        input.data.content !== undefined ? input.data.content : assignment.content
      )
    }

    if (input.data.dueAt) {
      assignment.updateDeadline(input.data.dueAt)
    }

    if (input.data.status) {
      if (input.data.status === 'PUBLISHED') assignment.publish()
      else if (input.data.status === 'CLOSED') assignment.close()
    }

    const updated = await this.assignmentRepository.update(assignment)

    return new AssignmentResponseDTO(
      updated.id,
      updated.classId,
      updated.title,
      updated.type,
      updated.status,
      updated.maxScore,
      updated.description,
      updated.dueAt,
      updated.content,
      updated.createdAt
    )
  }
}
