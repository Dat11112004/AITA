import { PrismaClient } from '@prisma/client'
import { INotificationRepository } from '../../domain/repositories/notification-repository.interface.js'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

export interface BroadcastNotificationParams {
    title: string
    message: string
    type?: string
    targetRole: 'ALL' | 'LECTURER' | 'STUDENT'
    createdBy?: string
}

export class BroadcastNotificationUseCase {
    constructor(_notificationRepo: INotificationRepository) { }

    async execute(params: BroadcastNotificationParams) {
        // 1. Create the base notification
        const notificationId = uuidv4()
        const notification = await prisma.notification.create({
            data: {
                Id: notificationId,
                Title: params.title,
                Message: params.message,
                Type: params.type || 'SYSTEM',
                CreatedBy: params.createdBy,
                CreatedAt: new Date(),
            }
        })

        // 2. Determine target users
        let userIds: string[] = []
        if (params.targetRole === 'ALL') {
            const users = await prisma.user.findMany({ select: { Id: true } })
            userIds = users.map(u => u.Id)
        } else {
            const roles = await prisma.role.findMany({ where: { RoleName: params.targetRole } })
            if (roles.length > 0) {
                const userRoles = await prisma.userRole.findMany({
                    where: { RoleId: { in: roles.map(r => r.Id) } },
                    select: { UserId: true }
                })
                userIds = userRoles.map(ur => ur.UserId)
            }
        }

        // 3. Create NotificationRecipients
        if (userIds.length > 0) {
            // Prisma createMany is efficient for batch inserts
            const recipients = userIds.map(userId => ({
                NotificationId: notificationId,
                UserId: userId,
                IsRead: false
            }))
            
            await prisma.notificationRecipient.createMany({
                data: recipients
            })
        }

        return {
            notification,
            recipientCount: userIds.length
        }
    }
}
