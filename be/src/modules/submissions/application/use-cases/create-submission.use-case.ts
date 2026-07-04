import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { CreateSubmissionRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'
import { Submission } from '../../domain/entities/submission.entity.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import type { AssessSubmissionUseCase } from '../../../ai/application/use-cases/assess-submission.use-case.js'

export class CreateSubmissionUseCase implements IUseCase<{ dto: CreateSubmissionRequestDto; user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(
    private readonly submissionRepo: ISubmissionRepository,
    private readonly uow: IUnitOfWork,
    private readonly assessSubmissionUseCase?: AssessSubmissionUseCase
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
    const enrollmentRepo = this.uow.resolve<any>(Symbol.for('EnrollmentRepository'))
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
    if (exam.dueDate) {
      const now = new Date()
      const dueDate = new Date(exam.dueDate)
      if (now > dueDate) {
        throw new ValidationError('Hạn nộp bài đã hết')
      }
    }

    const submission = Submission.create(
      randomUUID(),
      user.id,
      examId,
      classId,
      1, // attemptNumber
      dto.data.zipFileUrl ?? ''
    )

    await this.submissionRepo.create(submission)

    // Trigger AI background grading if it is an assignment
    if (exam.examType === 'Assignment' && this.assessSubmissionUseCase) {
      // Run asynchronously without awaiting
      this.assessSubmissionUseCase.execute(submission.id).catch(err => {
        console.error(`[Background Grading] Error assessing submission ${submission.id}:`, err);
      });
    }

    return SubmissionResponseDto.from(submission as any)
  }

  private isValidFileUrl(url: string): boolean {
    try {
      if (url.startsWith('data:')) return true;
      if (url.startsWith('blob:')) return true;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
