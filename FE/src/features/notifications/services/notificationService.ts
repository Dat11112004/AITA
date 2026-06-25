/**
 * Notifications Service
 */

import { apiClient } from '@/lib/apiClient'

export interface Notification {
    id: string
    title: string
    message: string
    type: string
    read: boolean
    createdAt: string
}

class NotificationService {
    async getNotifications(): Promise<Notification[]> {
        return apiClient.get<Notification[]>('/notifications')
    }

    async markAsRead(id: string): Promise<void> {
        return apiClient.patch<void>(`/notifications/${id}/read`, {})
    }

    async sendNotification(data: any): Promise<Notification> {
        return apiClient.post<Notification>('/notifications', data)
    }
}

export const notificationService = new NotificationService()
