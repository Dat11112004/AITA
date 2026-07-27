import { INotificationRepository } from '../../domain/repositories/notification-repository.interface.js'
import { Notification } from '../../domain/entities/notification.entity.js'

export class PrismaNotificationRepository implements INotificationRepository {
    constructor(private readonly prisma: any) { }

    async findForUser(userId: string, params: { limit?: number; offset?: number; read?: boolean }): Promise<Notification[]> {
        const recipientWhere: any = { UserId: userId }
        if (typeof params.read === 'boolean') {
            recipientWhere.IsRead = params.read
        }

        const list = await (this.prisma as any).notification.findMany({
            where: {
                NotificationRecipient: {
                    some: recipientWhere
                },
                Type: {
                    notIn: ['Reminder', 'DEADLINE_WARNING']
                }
            },
            take: params.limit ?? 50,
            skip: params.offset ?? 0,
            orderBy: { CreatedAt: 'desc' },
            include: {
                NotificationRecipient: {
                    where: { UserId: userId },
                    select: { IsRead: true, ReadAt: true }
                }
            }
        })

        // Filter out all automatic deadline reminders — only display notifications sent by lecturers
        const filteredList = list.filter((l: any) => {
            const isDeadlineNotif = l.Type === 'Reminder' || l.Type === 'DEADLINE_WARNING';
            if (isDeadlineNotif) return false;
            return true;
        }).slice(0, params.limit ?? 20);

        return filteredList.map((l: any) => {
            const notif = Notification.restore(
                l.Id, l.Title, l.Message, l.Type, l.ReferenceId, l.ReferenceType, l.CreatedBy, l.CreatedAt
            )
            const recipient = l.NotificationRecipient?.[0]
            ;(notif as any).isRead = recipient?.IsRead ?? false
            ;(notif as any).read = recipient?.IsRead ?? false
            return notif
        })
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

    async deleteForUser(userId: string, notificationId: string): Promise<void> {
        await (this.prisma as any).notificationRecipient.deleteMany({
            where: { UserId: userId, NotificationId: notificationId }
        })
    }

    async deleteAllForUser(userId: string): Promise<void> {
        await (this.prisma as any).notificationRecipient.deleteMany({
            where: { UserId: userId }
        })
    }
}
