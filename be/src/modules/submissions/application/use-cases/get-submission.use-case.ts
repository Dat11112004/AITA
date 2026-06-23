import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { SubmissionResponseDto } from '../dtos/submission.dto.js'

export class GetSubmissionUseCase implements IUseCase<{ id: string; user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute({ id }: { id: string; user: AuthUser }) {
    const submission = await this.uow.submissionRepository.findById(id)
    if (!submission) throw new NotFoundError('Không tìm thấy bài nộp')
    return SubmissionResponseDto.from(submission)
  }
}
