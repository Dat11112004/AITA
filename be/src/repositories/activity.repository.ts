import { prisma } from '../database/prisma.js'
import type { Prisma } from '@prisma/client'

export const activityRepository = {
  create: (data: Prisma.ActivityLogUncheckedCreateInput) => prisma.activityLog.create({ data }),
  findMany: (take: number = 20) => prisma.activityLog.findMany({
    take,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true, email: true } } },
  }),
  count: (where?: Prisma.ActivityLogWhereInput) => prisma.activityLog.count({ where }),
}
