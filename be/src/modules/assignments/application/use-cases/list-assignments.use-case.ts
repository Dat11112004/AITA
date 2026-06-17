import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IAssignmentRepository } from '../../domain/repositories/assignment.repository.interface.js'
import { AssignmentResponseDTO } from '../dtos/assignment.dtos.js'

export class ListAssignmentsUseCase implements IUseCase<{ classId?: string }, AssignmentResponseDTO[]> {
  constructor(private assignmentRepository: IAssignmentRepository) {}

  async execute(input: { classId?: string }): Promise<AssignmentResponseDTO[]> {
    let assignments

    if (input.classId) {
      assignments = await this.assignmentRepository.findByClassId(input.classId)
    } else {
      assignments = await this.assignmentRepository.listAll()
    }

    return assignments.map(a => new AssignmentResponseDTO(
      a.id,
      a.classId,
      a.title,
      a.type,
      a.status,
      a.maxScore,
      a.description,
      a.dueAt,
      a.content,
      a.createdAt
    ))
  }
}
