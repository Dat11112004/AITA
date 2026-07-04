import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { IEmailService } from '../../../../shared/application/email.service.interface.js'
import { logger } from '../../../../shared/infrastructure/logger.js'

const prisma = new PrismaClient()

export interface SendAssignmentNotificationParams {
    examId: string
    title: string
    type: string
    classIds: string[]
    createdBy: string
}

export class SendAssignmentNotificationUseCase {
    constructor(private readonly emailService: IEmailService) {}

    async execute(params: SendAssignmentNotificationParams) {
        try {
            if (!params.classIds || params.classIds.length === 0) return

            // 1. Get all students enrolled in these classes
            const studentClasses = await prisma.studentClass.findMany({
                where: { ClassId: { in: params.classIds } },
                include: { User: true }
            })

            // Filter out duplicates (a student might be in multiple selected classes)
            const uniqueStudentsMap = new Map<string, any>()
            for (const sc of studentClasses) {
                if (sc.User) {
                    uniqueStudentsMap.set(sc.UserId, sc.User)
                }
            }
            
            const students = Array.from(uniqueStudentsMap.values())
            if (students.length === 0) return

            // 2. Create In-App Notification
            const notificationId = uuidv4()
            const message = `Giảng viên đã giao ${params.type === 'Exam' ? 'đề thi' : 'bài tập'} mới: ${params.title}. Vui lòng kiểm tra trên hệ thống.`
            
            await prisma.notification.create({
                data: {
                    Id: notificationId,
                    Title: `Bài tập mới: ${params.title}`,
                    Message: message,
                    Type: 'SYSTEM',
                    ReferenceId: params.examId,
                    ReferenceType: 'EXAM',
                    CreatedBy: params.createdBy,
                    CreatedAt: new Date(),
                }
            })

            // 3. Create Notification Recipients
            const recipients = students.map(student => ({
                NotificationId: notificationId,
                UserId: student.Id,
                IsRead: false
            }))
            
            await prisma.notificationRecipient.createMany({
                data: recipients
            })

            // 4. Send Emails asynchronously
            const emailHtml = `
                <h3>Xin chào,</h3>
                <p>${message}</p>
                <p>Chi tiết: <strong>${params.title}</strong></p>
                <br />
                <p>Trân trọng,<br>Hệ thống AITA</p>
            `

            const emailSubject = `[AITA] Bài tập mới: ${params.title}`

            // Fire and forget email sending to not block
            const validEmails = students.map(s => s.Email).filter(Boolean) as string[]
            if (validEmails.length > 0) {
                this.emailService.sendEmail(validEmails, emailSubject, emailHtml).catch(err => {
                    logger.error(`Failed to send bulk email: ${err.message}`)
                })
            }

            logger.info(`Notification sent to ${students.length} students for exam ${params.examId}`)

        } catch (error: any) {
            logger.error(`SendAssignmentNotificationUseCase error: ${error.message}`)
        }
    }
}
