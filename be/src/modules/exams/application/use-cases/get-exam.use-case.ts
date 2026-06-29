import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { ExamResponseDto } from '../dtos/exam.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class GetExamUseCase implements IUseCase<string, ExamResponseDto> {
  constructor(private readonly examRepo: IExamRepository) {}

  async execute(id: string): Promise<ExamResponseDto> {
    const exam = await this.examRepo.findById(id)
    if (!exam) {
      throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)
    }
    
    return ExamResponseDto.from(exam as any)
  }
}
