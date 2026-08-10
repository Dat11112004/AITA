import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import type { AuthUser } from '../../../../types/express.js'

export class BulkPublishGradesUseCase implements IUseCase<{ assignmentId: string; user: AuthUser }, { success: boolean, count: number }> {
  constructor(private readonly submissionRepo: ISubmissionRepository) { }

  async execute({ assignmentId, user }: { assignmentId: string; user: AuthUser }) {
    // Find all submissions for this assignment
    const submissions = await this.submissionRepo.findMany({ examId: assignmentId })
    
    let count = 0
    for (const submission of submissions) {
      if (submission.reviewStatus === 'PUBLISHED') {
        continue // Skip if already published
      }

      // If it hasn't been graded formally, complete grading
      if (!submission.isGraded()) {
        submission.completeGrading(submission.totalScore ?? 0)
      }

      // Review logic: fallback to finalScore, then totalScore
      const effectiveScore = submission.finalScore ?? submission.totalScore ?? 0
      submission.review(user.id, effectiveScore)
      
      await this.submissionRepo.save(submission)
      count++
    }

    return { success: true, count }
  }
}
