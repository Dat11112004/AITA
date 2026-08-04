import { INotificationRepository } from '../../domain/repositories/notification-repository.interface.js'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../../../database/prisma.js'
import { AppError } from '../../../../shared/application/app.error.js'

export interface BroadcastNotificationParams {
    title: string
    message: string
    type?: string
    /** Role-wide broadcast. Ignored when `classIds` is supplied. */
    targetRole?: 'ALL' | 'LECTURER' | 'STUDENT'
    /** Send to the students enrolled in these classes instead of a whole role. */
    classIds?: string[]
    createdBy?: string
    /** Role of the caller — a LECTURER may only target classes they actually teach. */
    actorRole?: string
}

export class BroadcastNotificationUseCase {
    constructor(_notificationRepo: INotificationRepository) { }

    async execute(params: BroadcastNotificationParams) {
        const classIds = (params.classIds ?? []).filter(Boolean)
        const byClass = classIds.length > 0

        if (!byClass && !params.targetRole) {
            throw new AppError('BROADCAST_NO_TARGET', 'Phải chọn lớp hoặc vai trò nhận thông báo', 400)
        }

        // Resolve recipients BEFORE writing anything, so a rejected target leaves no orphan row.
        const userIds = byClass
            ? await this.studentsOfClasses(classIds, params)
            : await this.usersOfRole(params.targetRole!)

        const notificationId = uuidv4()
        const notification = await prisma.notification.create({
            data: {
                Id: notificationId,
                Title: params.title,
                Message: params.message,
                Type: params.type || (byClass ? 'CLASS' : 'SYSTEM'),
                CreatedBy: params.createdBy,
                CreatedAt: new Date(),
            }
        })

        if (userIds.length > 0) {
            await prisma.notificationRecipient.createMany({
                data: userIds.map(userId => ({ NotificationId: notificationId, UserId: userId, IsRead: false }))
            })
        }

        return { notification, recipientCount: userIds.length, classIds: byClass ? classIds : undefined }
    }

    /** Students enrolled in the given classes. A lecturer is confined to their own classes. */
    private async studentsOfClasses(classIds: string[], params: BroadcastNotificationParams): Promise<string[]> {
        if (String(params.actorRole).toUpperCase() === 'LECTURER') {
            const own = await prisma.instructorClass.findMany({
                where: { UserId: params.createdBy, ClassId: { in: classIds } },
                select: { ClassId: true },
            })
            const allowed = new Set(own.map(o => o.ClassId))
            const denied = classIds.filter(id => !allowed.has(id))
            if (denied.length > 0) {
                throw new AppError('CLASS_NOT_OWNED', 'Bạn chỉ được gửi thông báo cho lớp mình phụ trách', 403)
            }
        }

        const enrolled = await prisma.studentClass.findMany({
            where: { ClassId: { in: classIds } },
            select: { UserId: true },
        })
        return [...new Set(enrolled.map(e => e.UserId))]
    }

    private async usersOfRole(targetRole: 'ALL' | 'LECTURER' | 'STUDENT'): Promise<string[]> {
        if (targetRole === 'ALL') {
            const users = await prisma.user.findMany({ select: { Id: true } })
            return users.map(u => u.Id)
        }
        const roles = await prisma.role.findMany({ where: { RoleName: targetRole } })
        if (roles.length === 0) return []
        const userRoles = await prisma.userRole.findMany({
            where: { RoleId: { in: roles.map(r => r.Id) } },
            select: { UserId: true }
        })
        return [...new Set(userRoles.map(ur => ur.UserId))]
    }
}
