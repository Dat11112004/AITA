import { INotificationRepository } from '../../domain/repositories/notification-repository.interface.js'
import { Notification } from '../../domain/entities/notification.entity.js'

export class PrismaNotificationRepository implements INotificationRepository {
    constructor(private readonly prisma: any) { }

    async findForUser(userId: string, params: { limit?: number; offset?: number; read?: boolean }): Promise<Notification[]> {
        const list = await (this.prisma as any).notification.findMany({
            where: {
                NotificationRecipients: {
                    some: {
                        UserId: userId,
                        IsRead: params.read
                    }
                }
            },
            take: params.limit ?? 20,
            skip: params.offset ?? 0,
            orderBy: { CreatedAt: 'desc' }
        })

        return list.map((l: any) => Notification.restore(
            l.Id, l.Title, l.Message, l.Type, l.ReferenceId, l.ReferenceType, l.CreatedBy, l.CreatedAt
        ))
    }

    async getById(id: string): Promise<Notification | null> {
        const n = await (this.prisma as any).notification.findUnique({ where: { Id: id } })
        if (!n) return null
        return Notification.restore(n.Id, n.Title, n.Message, n.Type, n.ReferenceId, n.ReferenceType, n.CreatedBy, n.CreatedAt)
    }

    async save(notification: Notification): Promise<void> {
        await (this.prisma as any).notification.upsert({
            where: { Id: notification.id },
            create: {
                Id: notification.id,
                Title: notification.title,
                Message: notification.message,
                Type: notification.type,
                ReferenceId: notification.referenceId,
                ReferenceType: notification.referenceType,
                CreatedBy: notification.createdBy,
                CreatedAt: notification.createdAt
            },
            update: {
                Title: notification.title,
                Message: notification.message
            }
        })
    }

    async markAsRead(userId: string, notificationId: string): Promise<void> {
        await (this.prisma as any).notificationRecipient.updateMany({
            where: { UserId: userId, NotificationId: notificationId, IsRead: false },
            data: { IsRead: true, ReadAt: new Date() }
        })
    }

    async markAllAsRead(userId: string): Promise<void> {
        await (this.prisma as any).notificationRecipient.updateMany({
            where: { UserId: userId, IsRead: false },
            data: { IsRead: true, ReadAt: new Date() }
        })
    }
}
