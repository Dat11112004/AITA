import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { ExamResponseDto } from '../dtos/exam.dto.js'
import { notFound } from '../../../../utils/errors.js'

export class GetExamUseCase implements IUseCase<string, ExamResponseDto> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(id: string): Promise<ExamResponseDto> {
    const exam = await this.uow.examRepository.findById(id)
    if (!exam) {
      throw notFound('Bài tập/Kiểm tra không tồn tại')
    }
    
    return ExamResponseDto.from(exam)
  }
}
