import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { Class } from '../../domain/entities/class.entity.js'
import { ClassDomainService } from '../../domain/services/class.domain.service.js'
import { IClassRepository } from '../../domain/repositories/class.repository.interface.js'
import { ValidationError, ConflictError } from '../../../../shared/application/app.error.js'
import { CreateClassRequestDTO, ClassResponseDTO } from '../dtos/class.dtos.js'
import { v4 as uuidv4 } from 'uuid'

export class CreateClassUseCase implements IUseCase<CreateClassRequestDTO, ClassResponseDTO> {
  constructor(
    private classRepository: IClassRepository,
    private classDomainService: ClassDomainService
  ) {}

  async execute(input: CreateClassRequestDTO): Promise<ClassResponseDTO> {
    const codeValidation = this.classDomainService.validateClassCode(input.code)
    if (!codeValidation.valid) {
      throw new ValidationError(codeValidation.message || 'Invalid class code')
    }

    const nameValidation = this.classDomainService.validateClassName(input.name)
    if (!nameValidation.valid) {
      throw new ValidationError(nameValidation.message || 'Invalid class name')
    }

    const existingClass = await this.classRepository.findByCode(input.code)
    if (existingClass) {
      throw new ConflictError('Class code already exists')
    }

    const classId = uuidv4()
    const classEntity = Class.create(
      classId,
      input.code,
      input.name,
      input.subject,
      input.semester,
      input.lecturerId,
      input.campus,
      input.schedule
    )

    const savedClass = await this.classRepository.create(classEntity)

    return new ClassResponseDTO(
      savedClass.id,
      savedClass.code,
      savedClass.name,
      savedClass.subject,
      savedClass.semester,
      savedClass.lecturerId,
      savedClass.campus,
      savedClass.schedule,
      savedClass.createdAt
    )
  }
}
