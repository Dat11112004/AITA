import { Notification } from '../entities/notification.entity.js'

export interface INotificationRepository {
    findForUser(userId: string, params: { limit?: number; offset?: number; read?: boolean }): Promise<Notification[]>
    getById(id: string): Promise<Notification | null>
    save(notification: Notification): Promise<void>
    markAllAsRead(userId: string): Promise<void>
}
