import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { badRequest, notFound } from '../../../../utils/errors.js'
import { CreateSubmissionRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'

export class CreateSubmissionUseCase implements IUseCase<{ dto: CreateSubmissionRequestDto; user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute({ dto, user }: { dto: CreateSubmissionRequestDto; user: AuthUser }) {
    const examId = dto.data.examId ?? dto.data.assignmentId
    if (!examId) throw badRequest('assignmentId hoặc examId là bắt buộc')

    const exam = await this.uow.examRepository.findById(examId)
    if (!exam) throw notFound('Bài tập không khả dụng')

    const classId = dto.data.classId || (exam as any).SubjectId
    if (!classId) throw badRequest('classId hoặc SubjectId là bắt buộc')

    // Verify student is enrolled in the class
    const enrollment = await this.uow.enrollmentRepository.findMany({
      ClassId: classId,
      UserId: user.id,
    })
    if (!enrollment || enrollment.length === 0) {
      throw badRequest('Sinh viên chưa được tuyển sinh vào lớp này')
    }

    // Check for duplicate submission
    const existingSubmission = await this.uow.submissionRepository.findMany({
      ExamId: examId,
      StudentId: user.id,
      IsLatest: true,
    })
    if (existingSubmission && existingSubmission.length > 0) {
      throw badRequest('Bạn đã nộp bài cho bài tập này rồi')
    }

    // Validate file URL format
    if (dto.data.zipFileUrl && !this.isValidFileUrl(dto.data.zipFileUrl)) {
      throw badRequest('URL tập tin không hợp lệ')
    }

    // Check deadline if exam has one
    const now = new Date()
    const dueDate = (exam as any).DueDate
    if (dueDate && new Date(dueDate) < now) {
      throw badRequest('Hạn nộp bài đã hết')
    }

    const submission = await this.uow.submissionRepository.create({
      ExamId: examId,
      StudentId: user.id,
      ClassId: classId,
      AttemptNumber: 1,
      IsLatest: true,
      SubmittedAt: now,
      ZipFileUrl: dto.data.zipFileUrl,
      GradingStatus: 'Pending',
      ReviewStatus: 'PendingReview',
    })

    return SubmissionResponseDto.from(submission)
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
