import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import type { AuthUser } from '../../../../types/express.js'
import { PublishGradeRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { prisma } from '../../../../database/prisma.js'
import { calculateLatePenalty } from '../../domain/utils/late-penalty-calculator.js'

export class PublishGradeUseCase implements IUseCase<{ id: string; dto: PublishGradeRequestDto, user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(private readonly submissionRepo: ISubmissionRepository) { }

  async execute({ id, dto, user }: { id: string; dto: PublishGradeRequestDto, user: AuthUser }) {
    const submission = await this.submissionRepo.findById(id)
    if (!submission) throw new NotFoundError(MESSAGES.SUBMISSION_NOT_FOUND)

    const rawScoreInput = Number(dto.data.score ?? dto.data.finalScore ?? submission.totalScore ?? 0)

    // Fetch Exam details & SubmissionOverride if any
    const dbSub = await prisma.submission.findUnique({
      where: { Id: id },
      include: {
        Exam: true,
      }
    })

    let override = null
    if (dbSub?.ExamId && dbSub?.StudentId && (prisma as any).submissionOverride?.findUnique) {
      try {
        override = await (prisma as any).submissionOverride.findUnique({
          where: {
            ExamId_StudentId: {
              ExamId: dbSub.ExamId,
              StudentId: dbSub.StudentId,
            }
          }
        })
      } catch (e) {
        console.warn('SubmissionOverride lookup skipped in publish-grade:', e)
      }
    }

    const penaltyCalc = calculateLatePenalty({
      rawScore: rawScoreInput,
      submittedAt: dbSub?.SubmittedAt || (submission as any).submittedAt || null,
      originalDueDate: dbSub?.Exam?.DueDate || null,
      override: override ? {
        extendedDueDate: override.ExtendedDueDate,
        penaltyMode: override.PenaltyMode,
        customPenaltyRate: override.CustomPenaltyRate ? Number(override.CustomPenaltyRate) : null,
        flatPenaltyAmount: override.FlatPenaltyAmount ? Number(override.FlatPenaltyAmount) : null,
        scoreCap: override.ScoreCap ? Number(override.ScoreCap) : null,
      } : null,
      examPenaltyType: (dbSub?.Exam as any)?.LatePenaltyType,
      examPenaltyValue: (dbSub?.Exam as any)?.LatePenaltyValue ? Number((dbSub?.Exam as any).LatePenaltyValue) : null,
      maxLatePenalty: (dbSub?.Exam as any)?.MaxLatePenalty ? Number((dbSub?.Exam as any).MaxLatePenalty) : null,
    })

    const finalScoreNum = dto.data.finalScore !== undefined ? Number(dto.data.finalScore) : penaltyCalc.finalScore

    // Complete grading sequence if not already marked as Graded
    if (!submission.isGraded()) {
      submission.completeGrading(rawScoreInput)
    }
    
    // Apply review
    submission.review(
      user.id,
      finalScoreNum,
      dto.data.feedback
    )

    await this.submissionRepo.save(submission)

    // Update RawScore and LatePenaltyAmount in Prisma database
    await prisma.submission.update({
      where: { Id: id },
      data: {
        RawScore: penaltyCalc.rawScore,
        LatePenaltyAmount: penaltyCalc.latePenaltyAmount,
        FinalScore: finalScoreNum,
      } as any
    })

    const updatedSub = await prisma.submission.findUnique({
      where: { Id: id },
      include: {
        User_Submission_StudentIdToUser: true,
        Exam: true,
        Class: true,
      }
    })

    return SubmissionResponseDto.from(updatedSub || (submission as any))
  }
}
