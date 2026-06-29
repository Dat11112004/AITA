import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface.js'
import { SubjectRequestDto, SubjectResponseDto } from '../dtos/subject.dto.js'
import { Subject } from '../../domain/entities/subject.entity.js'
import { ConflictError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class CreateSubjectUseCase implements IUseCase<SubjectRequestDto, ReturnType<typeof SubjectResponseDto.from>> {
  constructor(private readonly subjectRepo: ISubjectRepository) {}

  async execute(dto: SubjectRequestDto) {
    const existing = await this.subjectRepo.findByCode(dto.data.code)
    if (existing) {
      throw new ConflictError(MESSAGES.SUBJECT_ALREADY_EXISTS)
    }

    const subject = Subject.create(
      randomUUID(),
      dto.data.code,
      dto.data.name
    )

    await this.subjectRepo.create(subject)

    return SubjectResponseDto.from(subject as any)
  }
}
