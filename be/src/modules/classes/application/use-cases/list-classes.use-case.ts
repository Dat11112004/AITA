import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IClassRepository } from '../../domain/repositories/class-repository.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { ClassResponseDto } from '../dtos/class.dto.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'

export class ListClassesUseCase implements IUseCase<{ user: AuthUser, page?: number, limit?: number }, ReturnType<typeof ClassResponseDto.from>[]> {
  constructor(
    private readonly classRepo: IClassRepository,
    _uow: IUnitOfWork
  ) {
    if (!_uow) throw new Error('uow is required')
  }

  async execute({ user, page = 1, limit = 10 }: { user: AuthUser, page?: number, limit?: number }) {
    const filter: any = {}

    if (user.role === 'LECTURER') {
      filter.instructorId = user.id
    }
    
    // For student role, we still need to filter by enrolled classes.
    // We can do this either by pulling enrollment first, or if the repo supported it directly.
    let classes = []
    
    if (user.role === 'STUDENT') {
      const enrollmentRepo = { findMany: async (_f: any) => [] } // dummy
      const enrolled = await enrollmentRepo.findMany({ UserId: user.id })
      const classIds = new Set(enrolled.map((e: any) => e.ClassId))
      // Since our new pure repo doesn't support an `in` array for ID yet easily without extending the filter,
      // we can fetch all and filter in memory, or extending the filter is better.
      // For now, let's fetch all and filter in memory as a pragmatic bridge.
      const allClasses = await this.classRepo.findMany()
      classes = allClasses.filter(c => classIds.has(c.id))
    } else {
      const skip = (page - 1) * limit
      classes = await this.classRepo.findMany(filter, { skip, take: limit })
    }

    return classes.map(c => ClassResponseDto.from(c as any))
  }
}
