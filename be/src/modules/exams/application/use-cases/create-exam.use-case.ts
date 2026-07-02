import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { CreateExamRequestDto, ExamResponseDto } from '../dtos/exam.dto.js'
import { Exam } from '../../domain/entities/exam.entity.js'

export class CreateExamUseCase implements IUseCase<CreateExamRequestDto, ExamResponseDto> {
  constructor(private readonly examRepo: IExamRepository) { }

  async execute(dto: CreateExamRequestDto): Promise<ExamResponseDto> {
    const { data } = dto
    const examType = data.type === 'quiz' ? 'Quiz' : 'Assignment'

    const exam = Exam.create(
      randomUUID(),
      data.title,
      data.subjectId,
      examType as any,
      'system', // createdBy, ideally should be passed from AuthUser
      {
        description: data.description,
        totalPoints: data.maxScore ?? 10,
        duration: data.duration,
      }
    )

    await this.examRepo.create(exam)

    return ExamResponseDto.from(exam as any)
  }
}
