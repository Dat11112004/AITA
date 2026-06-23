import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { SubjectRequestDto, SubjectResponseDto } from '../dtos/subject.dto.js'
import { notFound } from '../../../../utils/errors.js'

export class UpdateSubjectUseCase implements IUseCase<{ id: string; dto: SubjectRequestDto }, SubjectResponseDto> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(params: { id: string; dto: SubjectRequestDto }): Promise<SubjectResponseDto> {
    const existing = await this.uow.subjectRepository.findById(params.id)
    if (!existing) {
      throw notFound('Môn học không tồn tại')
    }

    const subject = await this.uow.subjectRepository.update(params.id, {
      SubjectCode: params.dto.data.code,
      SubjectName: params.dto.data.name,
    })
    return SubjectResponseDto.from(subject)
  }
}
