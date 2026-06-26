import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { Prisma } from '../../../../database/prisma.js'
import { ListSubmissionsQueryDto, SubmissionResponseDto } from '../dtos/submission.dto.js'

export class ListSubmissionsUseCase implements IUseCase<{ user: AuthUser; query: ListSubmissionsQueryDto }, ReturnType<typeof SubmissionResponseDto.from>[]> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute({ user, query }: { user: AuthUser; query: ListSubmissionsQueryDto }) {
    const { assignmentId, examId, status } = query.data
    const where: Prisma.SubmissionWhereInput = {}
    const targetExamId = examId ?? assignmentId

    if (targetExamId) where.ExamId = targetExamId
    if (status) where.GradingStatus = status as any
    if (user.role === 'STUDENT') where.StudentId = user.id

    let submissions = await this.uow.submissionRepository.findMany(where)

    if (user.role === 'LECTURER') {
      const myClassIds = (await this.uow.classRepository.findMany({
        where: { InstructorClass: { some: { UserId: user.id } } }
      })).map((item: any) => item.Id)
      submissions = submissions.filter((submission: any) => myClassIds.includes(submission.ClassId))
    }

    return submissions.map(SubmissionResponseDto.from)
  }
}
