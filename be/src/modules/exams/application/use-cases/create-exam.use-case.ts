import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { CreateExamRequestDto, ExamResponseDto } from '../dtos/exam.dto.js'

export class CreateExamUseCase implements IUseCase<CreateExamRequestDto, ExamResponseDto> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute(dto: CreateExamRequestDto): Promise<ExamResponseDto> {
    const { data } = dto
    const examType = data.type === 'quiz' ? 'Quiz' : 'Assignment'

    const exam = await this.uow.examRepository.create({
      Title: data.title,
      Description: data.description,
      SubjectId: data.classId,
      ExamType: examType as any,
      Status: 'Draft',
      TotalPoints: data.maxScore ?? 10,
      Duration: data.dueAt ? Math.floor((new Date(data.dueAt).getTime() - Date.now()) / 60000) : undefined,
    })

    return ExamResponseDto.from(exam)
  }
}
