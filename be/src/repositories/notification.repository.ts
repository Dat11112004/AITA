import { prisma, Prisma } from '../database/prisma.js'

export const notificationRepository = {
  findMany: (where?: Prisma.NotificationWhereInput) => prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  }),
  findById: (id: string) => prisma.notification.findUnique({ where: { id } }),
  create: (data: Prisma.NotificationCreateInput) => prisma.notification.create({ data }),
  update: (id: string, data: Prisma.NotificationUpdateInput) => prisma.notification.update({ where: { id }, data }),
  delete: (id: string) => prisma.notification.delete({ where: { id } }),
  markAsRead: (id: string) => prisma.notification.update({ where: { id }, data: { read: true } }),
}
