import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { Prisma } from '../../../../database/prisma.js'
import { ClassResponseDto } from '../dtos/class.dto.js'

export class ListClassesUseCase implements IUseCase<{ user: AuthUser, page?: number, limit?: number }, ClassResponseDto[]> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute({ user, page = 1, limit = 10 }: { user: AuthUser, page?: number, limit?: number }): Promise<ClassResponseDto[]> {
    let where: Prisma.ClassWhereInput = {}

    if (user.role === 'LECTURER') {
      where.InstructorClass = { some: { UserId: user.id } }
    }
    if (user.role === 'STUDENT') {
      where.StudentClass = { some: { UserId: user.id } }
    }

    const skip = (page - 1) * limit
    const classes = await this.uow.classRepository.findMany({ where, skip, take: limit })
    // Internal note is visible only to staff; never expose it to students.
    const includeNote = user.role !== 'STUDENT'
    return classes.map((c) => ClassResponseDto.from(c, includeNote))
  }
}
