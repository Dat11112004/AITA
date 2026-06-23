import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { SubjectRequestDto, SubjectResponseDto } from '../dtos/subject.dto.js'

export class CreateSubjectUseCase implements IUseCase<SubjectRequestDto, SubjectResponseDto> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(dto: SubjectRequestDto): Promise<SubjectResponseDto> {
    const subject = await this.uow.subjectRepository.create({
      SubjectCode: dto.data.code,
      SubjectName: dto.data.name,
    })
    return SubjectResponseDto.from(subject)
  }
}
