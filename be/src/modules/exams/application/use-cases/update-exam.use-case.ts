import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { UpdateExamRequestDto, ExamResponseDto } from '../dtos/exam.dto.js'
import { notFound } from '../../../../utils/errors.js'

export class UpdateExamUseCase implements IUseCase<{ id: string; dto: UpdateExamRequestDto }, ExamResponseDto> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute(params: { id: string; dto: UpdateExamRequestDto }): Promise<ExamResponseDto> {
    const existing = await this.uow.examRepository.findById(params.id)
    if (!existing) {
      throw notFound('Bài tập/Kiểm tra không tồn tại')
    }

    const { data } = params.dto
    const normalizedStatus = data.status === 'published' ? 'Published' : data.status === 'draft' ? 'Draft' : data.status
    const exam = await this.uow.examRepository.update(params.id, {
      Title: data.title,
      Description: data.description,
      Status: normalizedStatus as any,
    })

    return ExamResponseDto.from(exam)
  }
}
