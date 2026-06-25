import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { notFound } from '../../../../utils/errors.js'
import { PublishGradeRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'

export class PublishGradeUseCase implements IUseCase<{ id: string; dto: PublishGradeRequestDto }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute({ id, dto }: { id: string; dto: PublishGradeRequestDto }) {
    const current = await this.uow.submissionRepository.findById(id)
    if (!current) throw notFound('Không tìm thấy bài nộp')

    const scoreNum = Number(dto.data.score ?? dto.data.finalScore ?? current.TotalScore ?? 0)
    const finalScoreNum = Number(dto.data.finalScore ?? scoreNum)

    const now = new Date()

    const updated = await this.uow.submissionRepository.update(id, {
      TotalScore: scoreNum,
      FinalScore: finalScoreNum,
      InstructorFeedback: dto.data.feedback,
      ReviewedAt: now,
      GradedAt: now,
      GradingStatus: 'Graded',
      ReviewStatus: 'Reviewed',
    })

    return SubmissionResponseDto.from(updated)
  }
}
