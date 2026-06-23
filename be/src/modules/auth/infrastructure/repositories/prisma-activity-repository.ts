import type { AuditLog, Prisma } from '../../../../database/prisma.js'
import { IActivityRepository } from '../../domain/repositories/activity-repository.interface.js'

export class PrismaActivityRepository implements IActivityRepository {
  private client: any

  constructor(client: any) {
    this.client = client
  }

  async create(data: {
    userId?: string
    action: string
    entity: string
    entityId?: string
    metadata?: string
  }): Promise<AuditLog> {
    return this.client.auditLog.create({
      data: {
        UserId: data.userId,
        Action: data.action as any,
        EntityName: data.entity,
        EntityId: data.entityId,
        NewValue: data.metadata,
      },
    })
  }

  async findMany(take: number = 20): Promise<AuditLog[]> {
    return this.client.auditLog.findMany({
      take,
      orderBy: { CreatedAt: 'desc' },
      include: { User: true },
    })
  }

  async count(where?: Prisma.AuditLogWhereInput): Promise<number> {
    return this.client.auditLog.count({ where })
  }
}
