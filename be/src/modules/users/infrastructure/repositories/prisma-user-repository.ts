import type { IUserRepository, UserFilter, Pagination, RoleInfo, BulkDeleteResult } from '../../domain/repositories/user-repository.interface.js'
import { User } from '../../../auth/domain/entities/user.entity.js'
import { UserMapper } from '../mappers/user.mapper.js'

/**
 * Prisma-backed implementation of IUserRepository.
 * Receives a Prisma client (or transactional client) via constructor.
 * All public methods return domain entities — never raw Prisma models.
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly client: any) {}

  private get include() {
    return { UserRole: { include: { Role: true } } }
  }

  async findByEmail(email: string): Promise<User | null> {
    let raw = await this.client.user.findFirst({
      where: { Email: email },
      include: this.include,
    })
    
    if (!raw) {
      raw = await this.client.user.findFirst({
        where: { StudentCode: email },
        include: this.include,
      })
    }
    
    if (!raw) {
      raw = await this.client.user.findFirst({
        where: { LecturerCode: email },
        include: this.include,
      })
    }
    
    return raw ? UserMapper.toDomain(raw) : null
  }

  async findById(id: string): Promise<User | null> {
    const raw = await this.client.user.findUnique({
      where: { Id: id },
      include: this.include,
    })
    return raw ? UserMapper.toDomain(raw) : null
  }

  async findMany(filter?: UserFilter, pagination?: Pagination): Promise<User[]> {
    const where: any = {}
    if (filter?.role) {
      where.UserRole = { some: { Role: { RoleName: filter.role } } }
    }
    if (filter?.status) {
      where.Status = filter.status
    }
    if (filter?.search) {
      where.OR = [
        { FullName: { contains: filter.search } },
        { Email: { contains: filter.search } },
        { StudentCode: { contains: filter.search } },
        { LecturerCode: { contains: filter.search } },
      ]
    }
    if (filter?.ids) {
      where.Id = { in: filter.ids }
    }

    const raws = await this.client.user.findMany({
      where,
      skip: pagination?.skip,
      take: pagination?.take,
      include: this.include,
      orderBy: { Id: 'desc' },
    })
    return raws.map(UserMapper.toDomain)
  }

  async save(user: User): Promise<void> {
    await this.client.user.update({
      where: { Id: user.id },
      data: UserMapper.toUpdateData(user),
    })
  }

  async create(user: User): Promise<void> {
    await this.client.user.create({
      data: UserMapper.toCreateData(user),
    })
  }

  /**
   * SQL Server aborts one side of a deadlock instead of queueing it, and the
   * delete transaction below touches ~17 tables, so two deletes running at the
   * same time collide easily. Retry the whole transaction a few times before
   * giving up — P2034 is Prisma's "write conflict or deadlock" code.
   */
  private async withDeadlockRetry<T>(op: () => Promise<T>, attempts = 3): Promise<T> {
    let lastError: any
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await op()
      } catch (e: any) {
        const isDeadlock =
          e?.code === 'P2034' ||
          /write conflict|deadlock/i.test(e?.message ?? '')
        if (!isDeadlock || attempt === attempts) throw e
        lastError = e
        await new Promise(resolve => setTimeout(resolve, 100 * attempt))
      }
    }
    throw lastError
  }

  async delete(id: string): Promise<void> {
    await this.withDeadlockRetry(() =>
      this.client.$transaction([
        // Nullify optional foreign keys to avoid P2003 constraint failures
        this.client.exam.updateMany({ where: { CreatedBy: id }, data: { CreatedBy: null } }),
        this.client.promptTemplate.updateMany({ where: { CreatedBy: id }, data: { CreatedBy: null } }),
        this.client.notification.updateMany({ where: { CreatedBy: id }, data: { CreatedBy: null } }),
        this.client.gradingSession.updateMany({ where: { TriggeredBy: id }, data: { TriggeredBy: null } }),
        this.client.examGenerationHistory.updateMany({ where: { GeneratedBy: id }, data: { GeneratedBy: null } }),
        this.client.importBatch.updateMany({ where: { ImportedBy: id }, data: { ImportedBy: null } }),
        this.client.submission.updateMany({ where: { ReviewedBy: id }, data: { ReviewedBy: null } }),
        this.client.submission.updateMany({ where: { StudentId: id }, data: { StudentId: null } }),
        this.client.appeal.updateMany({ where: { StudentId: id }, data: { StudentId: null } }),

        // Delete dependent records
        this.client.userRole.deleteMany({ where: { UserId: id } }),
        this.client.studentClass.deleteMany({ where: { UserId: id } }),
        this.client.instructorClass.deleteMany({ where: { UserId: id } }),
        this.client.refreshToken.deleteMany({ where: { UserId: id } }),
        this.client.oAuthIdentity.deleteMany({ where: { UserId: id } }),
        this.client.auditLog.deleteMany({ where: { UserId: id } }),
        this.client.aiUsageLog.deleteMany({ where: { UserId: id } }),
        this.client.notificationRecipient.deleteMany({ where: { UserId: id } }),
        this.client.user.delete({ where: { Id: id } })
      ])
    )
  }

  /**
   * Deletes users one at a time, never concurrently.
   *
   * Callers used to fire N independent delete requests in parallel, which made
   * the per-user transactions deadlock against each other and left the delete
   * half-applied. Running them sequentially removes the contention entirely;
   * ids that are already gone are reported as skipped instead of failing the
   * whole batch, so a retry after a partial run is harmless.
   */
  async deleteMany(ids: string[]): Promise<BulkDeleteResult> {
    const result: BulkDeleteResult = { deleted: [], skipped: [], failed: [] }

    for (const id of ids) {
      const existing = await this.client.user.findUnique({ where: { Id: id }, select: { Id: true } })
      if (!existing) {
        result.skipped.push(id)
        continue
      }

      try {
        await this.delete(id)
        result.deleted.push(id)
      } catch (e: any) {
        result.failed.push({ id, reason: e?.message ?? 'Unknown error' })
      }
    }

    return result
  }

  async setRequirePasswordChange(userId: string, value: boolean): Promise<void> {
    await this.client.user.update({
      where: { Id: userId },
      data: { RequirePasswordChange: value },
    })
  }

  async count(filter?: UserFilter): Promise<number> {
    const where: any = {}
    if (filter?.role) {
      where.UserRole = { some: { Role: { RoleName: filter.role } } }
    }
    if (filter?.status) {
      where.Status = filter.status
    }
    return this.client.user.count({ where })
  }

  async findRoleByName(name: string): Promise<RoleInfo | null> {
    const raw = await this.client.role.findFirst({
      where: { RoleName: name },
    })
    return raw ? { id: raw.Id, name: raw.RoleName ?? '' } : null
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    await this.client.userRole.deleteMany({ where: { UserId: userId } })
    await this.client.userRole.create({
      data: { UserId: userId, RoleId: roleId },
    })
  }
}
