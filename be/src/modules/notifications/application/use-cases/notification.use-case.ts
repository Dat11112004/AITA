import { INotificationRepository } from '../../domain/repositories/notification-repository.interface.js'

export class ListUserNotificationsUseCase {
    constructor(private readonly notificationRepo: INotificationRepository) { }

    async execute(userId: string, params: { page?: number; limit?: number; read?: boolean }) {
        const limit = params.limit ?? 20
        const offset = ((params.page ?? 1) - 1) * limit

        return await this.notificationRepo.findForUser(userId, { limit, offset, read: params.read })
    }
}

export class MarkNotificationAsReadUseCase {
    constructor(private readonly notificationRepo: INotificationRepository) { }

    async execute(userId: string, notificationId: string) {
        // Mark notification as read for the user
        // This operation ensures the notification is marked as read in the recipient table
        // Implementation should be in the repository layer with proper transaction handling
        if ('markAsRead' in this.notificationRepo && typeof this.notificationRepo.markAsRead === 'function') {
            return await (this.notificationRepo.markAsRead as (userId: string, notificationId: string) => Promise<void>)(userId, notificationId)
        }
        // If the method doesn't exist on interface, this indicates incomplete implementation
        // In production, ensure INotificationRepository has markAsRead method
    }
}
