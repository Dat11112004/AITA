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
        await this.notificationRepo.markAsRead(userId, notificationId)
    }
}

export class MarkAllNotificationsAsReadUseCase {
    constructor(private readonly notificationRepo: INotificationRepository) { }

    async execute(userId: string) {
        await this.notificationRepo.markAllAsRead(userId)
    }
}
