import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { SubjectResponseDto } from '../dtos/subject.dto.js'

export class ListSubjectsUseCase implements IUseCase<void, SubjectResponseDto[]> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(): Promise<SubjectResponseDto[]> {
    const subjects = await this.uow.subjectRepository.findMany()
    return subjects.map(SubjectResponseDto.from)
  }
}
