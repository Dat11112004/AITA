import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { SubmissionResponseDto } from '../dtos/submission.dto.js'

export class RecentSubmissionsUseCase implements IUseCase<{ user: AuthUser; limit: number }, ReturnType<typeof SubmissionResponseDto.from>[]> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute({ user, limit }: { user: AuthUser; limit: number }) {
    const where: any = {}

    if (user.role === 'STUDENT') {
      where.StudentId = user.id
    }

    if (user.role === 'LECTURER') {
      const classes = await this.uow.classRepository.findMany({ where: { InstructorClass: { some: { UserId: user.id } } } })
      const allowedClassIds = classes.map(c => c.Id)
      where.ClassId = { in: allowedClassIds }
    }

    const submissions = await this.uow.submissionRepository.findRecent(where, limit)
    return submissions.map(SubmissionResponseDto.from)
  }
}
