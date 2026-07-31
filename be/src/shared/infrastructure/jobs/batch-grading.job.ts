import { prisma } from '../../../database/prisma.js'
import { logger } from '../logger.js'

/**
 * Batch grading job — the "dồn lại, chấm 1 lần" (BATCH_POST_DEADLINE) strategy.
 *
 * With that strategy, create-submission deliberately does NOT enqueue a grading job:
 * submissions are held in Pending. Nothing then graded them, so held submissions sat
 * in Pending forever unless a lecturer manually hit /grade-existing-batch — the option
 * existed in the UI but never actually took effect. This job is the missing half.
 *
 * Every tick it looks for published exams whose deadline has passed and whose strategy
 * is BATCH_POST_DEADLINE, and grades the still-ungraded submissions once.
 *
 * Two deliberate choices:
 *  - Submissions are graded SEQUENTIALLY. Grading calls an external AI service and this
 *    project's SQL Server accepts very few concurrent connections; a parallel fan-out
 *    would trip both.
 *  - A student with an unexpired SubmissionOverride extension is skipped, so their work
 *    is not graded before their own personal deadline.
 */
export class BatchGradingJob {
  private timer: NodeJS.Timeout | null = null
  /** Guards against a slow run overlapping with the next tick. */
  private running = false

  /** How often to look for exams whose deadline has passed. */
  private static readonly INTERVAL_MS = 10 * 60 * 1000

  start() {
    this.timer = setInterval(() => {
      this.run().catch((err) => logger.error('Error running batch grading job:', err))
    }, BatchGradingJob.INTERVAL_MS)

    // One pass shortly after boot so a deadline that passed while the server was down
    // is picked up without waiting a full interval.
    setTimeout(() => {
      this.run().catch((err) => logger.error('Error running batch grading job:', err))
    }, 20000)

    logger.info('Batch grading job started (Interval: 10m)')
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async run() {
    if (this.running) {
      logger.debug('Batch grading job already in progress, skipping this tick')
      return
    }
    this.running = true

    try {
      const now = new Date()

      const exams = await prisma.exam.findMany({
        where: {
          GradingStrategy: 'BATCH_POST_DEADLINE',
          DueDate: { not: null, lte: now },
        } as any,
        select: { Id: true, Title: true, DueDate: true } as any,
      })

      if (exams.length === 0) return

      let gradedCount = 0
      let skippedCount = 0

      for (const exam of exams as any[]) {
        const pending = await prisma.submission.findMany({
          where: {
            ExamId: exam.Id,
            IsLatest: true,
            ZipFileUrl: { not: null },
            OR: [
              { GradingStatus: { notIn: ['Processing', 'Graded', 'GRADED'] } },
              { GradingStatus: null },
            ],
          },
          select: { Id: true, StudentId: true },
        })

        if (pending.length === 0) continue

        for (const sub of pending) {
          try {
            if (await this.hasUnexpiredExtension(exam.Id, sub.StudentId, now)) {
              skippedCount++
              continue
            }

            const { engineSubmissionController } = await import(
              '../../../modules/grading/engine/modules/submissions/routes/index.js'
            )
            if (!engineSubmissionController) {
              logger.warn('Batch grading: grading engine not initialised yet, will retry next tick')
              return
            }

            // Awaited on purpose — see the note on sequential grading above.
            await engineSubmissionController.executeGradingForSubmission(sub.Id)
            gradedCount++
          } catch (err: any) {
            // One bad submission must not abort the whole batch.
            logger.error(`Batch grading failed for submission ${sub.Id}:`, err)
          }
        }
      }

      if (gradedCount > 0 || skippedCount > 0) {
        logger.info(
          `Batch grading job completed. Graded ${gradedCount} submission(s), ` +
          `skipped ${skippedCount} with an unexpired extension.`
        )
      }
    } finally {
      this.running = false
    }
  }

  /**
   * True when the lecturer granted this student an extension that has not yet passed.
   * Returns false if the override table is unavailable — better to grade on the exam
   * deadline than to leave work ungraded forever.
   */
  private async hasUnexpiredExtension(examId: string, studentId: string | null, now: Date): Promise<boolean> {
    if (!studentId) return false
    if (!(prisma as any).submissionOverride?.findUnique) return false

    try {
      const override = await (prisma as any).submissionOverride.findUnique({
        where: { ExamId_StudentId: { ExamId: examId, StudentId: studentId } },
      })
      if (!override?.ExtendedDueDate) return false
      return new Date(override.ExtendedDueDate) > now
    } catch {
      return false
    }
  }
}

export const batchGradingJob = new BatchGradingJob()
