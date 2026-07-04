import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import type { AuthUser } from '../../../../types/express.js'
import { PublishGradeRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class PublishGradeUseCase implements IUseCase<{ id: string; dto: PublishGradeRequestDto, user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(private readonly submissionRepo: ISubmissionRepository) { }

  async execute({ id, dto, user }: { id: string; dto: PublishGradeRequestDto, user: AuthUser }) {
    const submission = await this.submissionRepo.findById(id)
    if (!submission) throw new NotFoundError(MESSAGES.SUBMISSION_NOT_FOUND)

    const scoreNum = Number(dto.data.score ?? dto.data.finalScore ?? submission.totalScore ?? 0)
    const finalScoreNum = Number(dto.data.finalScore ?? scoreNum)

    // Complete grading sequence if not already marked as Graded
    if (!submission.isGraded()) {
      submission.completeGrading(scoreNum)
    }
    
    // Apply review
    submission.review(
      user.id,
      finalScoreNum,
      dto.data.feedback
    )

    await this.submissionRepo.save(submission)

    return SubmissionResponseDto.from(submission as any)
  }
}
