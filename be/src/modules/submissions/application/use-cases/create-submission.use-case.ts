import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { ValidationError } from '../../../../shared/application/app.error.js'
import { CreateSubmissionRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'

export class CreateSubmissionUseCase implements IUseCase<{ dto: CreateSubmissionRequestDto; user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute({ dto, user }: { dto: CreateSubmissionRequestDto; user: AuthUser }) {
    const examId = dto.data.examId ?? dto.data.assignmentId
    if (!examId) throw new ValidationError('assignmentId hoặc examId là bắt buộc')

    const exam = await this.uow.examRepository.findById(examId)
    if (!exam) throw new ValidationError('Bài tập không khả dụng')

    const submission = await this.uow.submissionRepository.create({
      ExamId: examId,
      StudentId: user.id,
      ClassId: dto.data.classId,
      AttemptNumber: 1,
      IsLatest: true,
      SubmittedAt: new Date(),
      ZipFileUrl: dto.data.zipFileUrl,
      GradingStatus: 'Pending',
      ReviewStatus: 'PendingReview',
    })

    return SubmissionResponseDto.from(submission)
  }
}
