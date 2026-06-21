import { prisma, Prisma } from '../database/prisma.js'

export const activityRepository = {
  create: (data: { userId?: string; action: string; entity: string; entityId?: string; metadata?: string }) =>
    prisma.auditLog.create({
      data: {
        UserId: data.userId,
        Action: data.action as any,
        EntityName: data.entity,
        EntityId: data.entityId,
        NewValue: data.metadata,
      },
    }),
  findMany: (take: number = 20) =>
    prisma.auditLog.findMany({
      take,
      orderBy: { CreatedAt: 'desc' },
      include: { User: true },
    }),
  count: (where?: Prisma.AuditLogWhereInput) => prisma.auditLog.count({ where }),
}
