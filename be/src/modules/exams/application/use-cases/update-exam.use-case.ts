import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { UpdateExamRequestDto, ExamResponseDto } from '../dtos/exam.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class UpdateExamUseCase implements IUseCase<{ id: string; dto: UpdateExamRequestDto }, ExamResponseDto> {
  constructor(private readonly examRepo: IExamRepository) { }

  async execute(params: { id: string; dto: UpdateExamRequestDto }): Promise<ExamResponseDto> {
    const exam = await this.examRepo.findById(params.id)
    if (!exam) {
      throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)
    }

    const { data } = params.dto
    
    exam.updateInfo({
      title: data.title,
      description: data.description,
    })

    if (data.status === 'published') exam.publish()
    else if (data.status === 'draft') {
      // Direct assignment needed if changing back from closed etc., but publish() is strictly validated
      if (exam.status !== 'Draft') {
        exam.status = 'Draft'
      }
    }

    await this.examRepo.save(exam)

    return ExamResponseDto.from(exam as any)
  }
}
