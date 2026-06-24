import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { PublishGradeRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'

export class PublishGradeUseCase implements IUseCase<{ id: string; dto: PublishGradeRequestDto; reviewerId?: string }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute({ id, dto }: { id: string; dto: PublishGradeRequestDto; reviewerId?: string }) {
    const current = await this.uow.submissionRepository.findById(id)
    if (!current) throw new NotFoundError('Không tìm thấy bài nộp')

    const score = dto.data.score ?? dto.data.finalScore ?? current.TotalScore ?? 0
    const updated = await this.uow.submissionRepository.update(id, {
      TotalScore: score,
      FinalScore: dto.data.finalScore ?? score,
      InstructorFeedback: dto.data.feedback,
      ReviewedAt: new Date(),
      GradedAt: new Date(),
      GradingStatus: 'Graded',
      ReviewStatus: 'Reviewed',
    })

    return SubmissionResponseDto.from(updated)
  }
}
