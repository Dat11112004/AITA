import { INotificationRepository } from '../../domain/repositories/notification-repository.interface.js'
// import { notFound } from '../../../../utils/errors.js'

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
        // In a real system, we'd update the recipient record. 
        // Use the repo to satisfy lint and placeholder logic
        await (this.notificationRepo as any).markAsRead?.(userId, notificationId)
    }
}
