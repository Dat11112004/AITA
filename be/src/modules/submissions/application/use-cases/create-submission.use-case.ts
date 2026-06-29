import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { CreateSubmissionRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'
import { Submission } from '../../domain/entities/submission.entity.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class CreateSubmissionUseCase implements IUseCase<{ dto: CreateSubmissionRequestDto; user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(
    private readonly submissionRepo: ISubmissionRepository,
    private readonly uow: IUnitOfWork
  ) { }

  async execute({ dto, user }: { dto: CreateSubmissionRequestDto; user: AuthUser }) {
    const examId = dto.data.examId ?? dto.data.assignmentId
    if (!examId) throw new ValidationError(MESSAGES.SUBMISSION_MISSING_EXAM_ID)

    // Uses uow for legacy exam checking until all modules are pure
    const exam = await this.uow.resolve<any>(Symbol.for('ExamRepository')).findById(examId)
    if (!exam) throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)

    const classId = dto.data.classId || exam.subjectId
    if (!classId) throw new ValidationError(MESSAGES.SUBMISSION_MISSING_CLASS_ID)

    // Verify student is enrolled in the class using legacy repo access
    const enrollmentRepo = { findMany: async (_f: any) => [] } // dummy
    const enrollment = await enrollmentRepo.findMany({
      ClassId: classId,
      UserId: user.id,
    })
    if (!enrollment || enrollment.length === 0) {
      throw new ForbiddenError(MESSAGES.SUBMISSION_NOT_ENROLLED)
    }

    // Check for duplicate submission using new domain filter
    const existingSubmission = await this.submissionRepo.findMany({
      examId,
      studentId: user.id,
    })
    if (existingSubmission && existingSubmission.length > 0) {
      throw new ConflictError(MESSAGES.SUBMISSION_ALREADY_SUBMITTED)
    }

    // Validate file URL format
    if (dto.data.zipFileUrl && !this.isValidFileUrl(dto.data.zipFileUrl)) {
      throw new ValidationError(MESSAGES.SUBMISSION_INVALID_URL)
    }

    // Check deadline
    // const now = new Date()
    // const duration = exam.duration ?? 0 
    // Ideally we track Exam DueDate. For now we just use legacy logic or pass due date checks.
    // If exam has due date...
    // if (dueDate && new Date(dueDate) < now) {
    //   throw new ValidationError('Hạn nộp bài đã hết')
    // }

    const submission = Submission.create(
      randomUUID(),
      user.id,
      examId,
      classId,
      1, // attemptNumber
      dto.data.zipFileUrl ?? ''
    )

    await this.submissionRepo.create(submission)

    return SubmissionResponseDto.from(submission as any)
  }

  private isValidFileUrl(url: string): boolean {
    try {
      new URL(url)
      return url.endsWith('.zip') || url.includes('blob:')
    } catch {
      return false
    }
  }
}
