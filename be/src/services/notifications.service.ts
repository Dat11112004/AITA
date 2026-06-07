import { notificationRepository } from '../repositories/notification.repository.js'
import { mapNotification } from '../utils/mappers.js'
import type { AuthUser } from '../types/express.js'

export const notificationsService = {
  async list(user: AuthUser) {
    const where: any = {
      OR: [
        { target: 'all' },
        { target: user.role.toLowerCase() },
        { target: user.id }
      ]
    }
    const notifications = await notificationRepository.findMany(where)
    return notifications.map(mapNotification)
  },
  async create(data: any) {
    const notification = await notificationRepository.create(data)
    return mapNotification(notification)
  },
  async markRead(id: string) {
    await notificationRepository.markAsRead(id)
  }
}
