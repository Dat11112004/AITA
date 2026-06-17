import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { Assignment } from '../../domain/entities/assignment.entity.js'
import { AssignmentDomainService } from '../../domain/services/assignment.domain.service.js'
import { IAssignmentRepository } from '../../domain/repositories/assignment.repository.interface.js'
import { ValidationError } from '../../../../shared/application/app.error.js'
import { CreateAssignmentRequestDTO, AssignmentResponseDTO } from '../dtos/assignment.dtos.js'
import { v4 as uuidv4 } from 'uuid'

export class CreateAssignmentUseCase implements IUseCase<CreateAssignmentRequestDTO, AssignmentResponseDTO> {
  constructor(
    private assignmentRepository: IAssignmentRepository,
    private assignmentDomainService: AssignmentDomainService
  ) {}

  async execute(input: CreateAssignmentRequestDTO): Promise<AssignmentResponseDTO> {
    const titleValidation = this.assignmentDomainService.validateTitle(input.title)
    if (!titleValidation.valid) {
      throw new ValidationError(titleValidation.message || 'Invalid title')
    }

    const typeValidation = this.assignmentDomainService.validateType(input.type)
    if (!typeValidation.valid) {
      throw new ValidationError(typeValidation.message || 'Invalid type')
    }

    const scoreValidation = this.assignmentDomainService.validateMaxScore(input.maxScore)
    if (!scoreValidation.valid) {
      throw new ValidationError(scoreValidation.message || 'Invalid max score')
    }

    const assignmentId = uuidv4()
    const assignment = Assignment.create(
      assignmentId,
      input.classId,
      input.title,
      input.type as any,
      input.description,
      input.dueAt,
      input.content,
      input.maxScore
    )

    const saved = await this.assignmentRepository.create(assignment)

    return new AssignmentResponseDTO(
      saved.id,
      saved.classId,
      saved.title,
      saved.type,
      saved.status,
      saved.maxScore,
      saved.description,
      saved.dueAt,
      saved.content,
      saved.createdAt
    )
  }
}
