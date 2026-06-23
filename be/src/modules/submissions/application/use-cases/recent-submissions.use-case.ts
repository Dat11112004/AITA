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
      const myClassIds = (await this.uow.classRepository.findMany({ InstructorClass: { some: { UserId: user.id } } })).map((item: any) => item.Id)
      where.ClassId = { in: myClassIds }
    }

    const submissions = await this.uow.submissionRepository.findRecent(where, limit)
    return submissions.map(SubmissionResponseDto.from)
  }
}
