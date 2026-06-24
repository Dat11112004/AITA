import type { Request, Response } from 'express'
import { ListUserNotificationsUseCase, MarkNotificationAsReadUseCase } from '../application/use-cases/notification.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'

export class NotificationsController {
    constructor(
        private readonly listUserNotificationsUseCase: ListUserNotificationsUseCase,
        private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase
    ) { }

    async listMyNotifications(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        const query = req.query as any
        const result = await this.listUserNotificationsUseCase.execute(userId, {
            page: Number(query.page || 1),
            limit: Number(query.limit || 20),
            read: query.read === 'true' ? true : query.read === 'false' ? false : undefined
        })
        res.status(200).json(ApiResponse.success('Lấy danh sách thông báo thành công', result))
    }

    async markAsRead(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        const notificationId = req.params.id as string
        await this.markNotificationAsReadUseCase.execute(userId, notificationId)
        res.status(200).json(ApiResponse.success('Đã đánh dấu thông báo là đã đọc', null))
    }
}
