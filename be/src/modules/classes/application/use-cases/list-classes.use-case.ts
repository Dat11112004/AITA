import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { Prisma } from '../../../../database/prisma.js'
import { ClassResponseDto } from '../dtos/class.dto.js'

export class ListClassesUseCase implements IUseCase<AuthUser, ClassResponseDto[]> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute(user: AuthUser): Promise<ClassResponseDto[]> {
    let where: Prisma.ClassWhereInput = {}

    if (user.role === 'LECTURER') {
      where.InstructorClass = { some: { UserId: user.id } }
    }
    if (user.role === 'STUDENT') {
      where.StudentClass = { some: { UserId: user.id } }
    }

    const classes = await this.uow.classRepository.findMany(where)
    return classes.map(ClassResponseDto.from)
  }
}
