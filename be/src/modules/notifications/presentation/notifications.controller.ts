import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { ListUserNotificationsUseCase, MarkNotificationAsReadUseCase } from '../application/use-cases/notification.use-case.js'
import { BroadcastNotificationUseCase } from '../application/use-cases/broadcast-notification.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class NotificationsController extends BaseController {
    constructor(
        private readonly listUserNotificationsUseCase: ListUserNotificationsUseCase,
        private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
        private readonly broadcastNotificationUseCase: BroadcastNotificationUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async listMyNotifications(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        const query = req.query as any
        this.logger.debug(`Fetching notifications for user: ${userId}`)
        const result = await this.listUserNotificationsUseCase.execute(userId, {
            page: Number(query.page || 1),
            limit: Number(query.limit || 20),
            read: query.read === 'true' ? true : query.read === 'false' ? false : undefined
        })
        this.ok(res, result, MESSAGES.NOTIFICATIONS_LIST_SUCCESS)
    }

    async markAsRead(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        const notificationId = req.params.id as string
        this.logger.info(`Marking notification ${notificationId} as read for user ${userId}`)
        await this.markNotificationAsReadUseCase.execute(userId, notificationId)
        this.ok(res, null, MESSAGES.NOTIFICATIONS_MARK_READ_SUCCESS)
    }

    async broadcast(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        const { title, message, type, targetRole } = req.body
        this.logger.info(`Broadcasting notification: ${title} to ${targetRole}`)
        const result = await this.broadcastNotificationUseCase.execute({
            title,
            message,
            type,
            targetRole,
            createdBy: userId
        })
        this.created(res, result, 'Broadcast notification successful')
    }
}
