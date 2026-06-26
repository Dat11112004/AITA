import { prisma, Prisma } from '../database/prisma.js'

export const notificationRepository = {
  findMany: (where?: Prisma.NotificationWhereInput) =>
    prisma.notification.findMany({
      where,
      orderBy: { CreatedAt: 'desc' },
    }),
  findById: (id: string) =>
    prisma.notification.findUnique({ where: { Id: id } }),
  create: (data: Prisma.NotificationUncheckedCreateInput) =>
    prisma.notification.create({ data }),
  update: (id: string, data: Prisma.NotificationUpdateInput) =>
    prisma.notification.update({ where: { Id: id }, data }),
  delete: (id: string) =>
    prisma.notification.delete({ where: { Id: id } }),
  markAsRead: (id: string) =>
    prisma.notification.update({ where: { Id: id }, data: { Title: undefined } }),
}
