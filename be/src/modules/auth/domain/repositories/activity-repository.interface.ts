import type { AuditLog, Prisma } from '../../../../database/prisma.js'

export interface IActivityRepository {
  create(data: {
    userId?: string
    action: string
    entity: string
    entityId?: string
    metadata?: string
  }): Promise<AuditLog>
  findMany(take?: number): Promise<AuditLog[]>
  count(where?: Prisma.AuditLogWhereInput): Promise<number>
}
