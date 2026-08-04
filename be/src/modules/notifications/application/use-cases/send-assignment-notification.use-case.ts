import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { IEmailService } from '../../../../shared/application/email.service.interface.js'
import { logger } from '../../../../shared/infrastructure/logger.js'

const prisma = new PrismaClient()

export interface SendAssignmentNotificationParams {
    examId: string
    title: string
    type: string
    classIds?: string[]
    subjectId?: string
    dueDate?: string | Date
    createdBy: string
}

export class SendAssignmentNotificationUseCase {
    constructor(private readonly emailService: IEmailService) { }

    async execute(params: SendAssignmentNotificationParams) {
        try {
            // 1. Fetch Exam and Subject details if available
            const exam = await prisma.exam.findUnique({
                where: { Id: params.examId },
                include: {
                    Subject: true,
                    ExamClass: true
                }
            })

            const subjectId = params.subjectId || exam?.SubjectId
            const subject = subjectId
                ? (exam?.Subject || await prisma.subject.findUnique({ where: { Id: subjectId } }))
                : null

            const subjectCode = subject?.SubjectCode || ''
            const subjectName = subject?.SubjectName || ''

            // Resolve DueDate from params, Exam, or ExamClass
            const rawDueDate = params.dueDate || exam?.DueDate || exam?.ExamClass?.[0]?.DueDate
            let formattedDueDate = ''
            if (rawDueDate) {
                const dt = new Date(rawDueDate)
                if (!isNaN(dt.getTime())) {
                    const hours = String(dt.getHours()).padStart(2, '0')
                    const minutes = String(dt.getMinutes()).padStart(2, '0')
                    const day = String(dt.getDate()).padStart(2, '0')
                    const month = String(dt.getMonth() + 1).padStart(2, '0')
                    const year = dt.getFullYear()
                    formattedDueDate = `${hours}:${minutes} ngày ${day}/${month}/${year}`
                }
            }

            // 2. Resolve target classIds
            let targetClassIds = params.classIds || []
            if (targetClassIds.length === 0 && exam?.ExamClass && exam.ExamClass.length > 0) {
                targetClassIds = exam.ExamClass.map(ec => ec.ClassId).filter(Boolean) as string[]
            }

            let students: any[] = []

            if (targetClassIds.length > 0) {
                const studentClasses = await prisma.studentClass.findMany({
                    where: { ClassId: { in: targetClassIds } },
                    include: { User: true }
                })
                const uniqueStudentsMap = new Map<string, any>()
                for (const sc of studentClasses) {
                    if (sc.User) {
                        uniqueStudentsMap.set(sc.UserId, sc.User)
                    }
                }
                students = Array.from(uniqueStudentsMap.values())
            } else if (subject?.Id) {
                // Fallback: get all students enrolled in classes belonging to this subject
                const studentClasses = await prisma.studentClass.findMany({
                    where: { Class: { SubjectId: subject.Id } },
                    include: { User: true }
                })
                const uniqueStudentsMap = new Map<string, any>()
                for (const sc of studentClasses) {
                    if (sc.User) {
                        uniqueStudentsMap.set(sc.UserId, sc.User)
                    }
                }
                students = Array.from(uniqueStudentsMap.values())
            }

            if (students.length === 0) {
                // Fallback 2: Find all student users in system
                const allStudents = await prisma.user.findMany({
                    where: {
                        OR: [
                            { UserRole: { some: { Role: { RoleName: { in: ['Student', 'STUDENT'] } } } } },
                            { StudentCode: { not: null } }
                        ]
                    }
                })
                students = allStudents
            }

            if (students.length === 0) {
                // Fallback 3: Send to all active users except the creator
                students = await prisma.user.findMany({
                    where: {
                        Id: { not: params.createdBy }
                    }
                })
            }

            if (students.length === 0) {
                logger.warn(`SendAssignmentNotificationUseCase: No target students found for exam ${params.examId}`)
                return
            }

            // 3. Format Notification Title and Message with clear Subject, Exam Title & Deadline
            const subjectLabel = subjectCode && subjectName
                ? `${subjectName} (${subjectCode})`
                : (subjectCode || subjectName || 'môn học')

            const notifTitle = subjectCode
                ? `[${subjectCode}] Bài tập mới: ${params.title}`
                : `Bài tập mới: ${params.title}`

            const isExamType = params.type === 'Exam' || params.type === 'Đề thi'
            const itemTypeLabel = isExamType ? 'đề thi' : 'bài tập'
            const deadlineText = formattedDueDate ? ` (Hạn nộp: ${formattedDueDate})` : ''

            const notifMessage = `Môn ${subjectLabel}: Giảng viên vừa đăng ${itemTypeLabel} "${params.title}"${deadlineText}. Vui lòng nhấp vào đây để xem chi tiết và nộp bài.`

            // 4. Create In-App Notification
            const notificationId = uuidv4()
            await prisma.notification.create({
                data: {
                    Id: notificationId,
                    Title: notifTitle,
                    Message: notifMessage,
                    Type: 'ASSIGNMENT',
                    ReferenceId: params.examId,
                    ReferenceType: 'EXAM',
                    CreatedBy: params.createdBy,
                    CreatedAt: new Date(),
                }
            })

            // 5. Create Recipients
            const recipients = students.map(student => ({
                NotificationId: notificationId,
                UserId: student.Id,
                IsRead: false
            }))

            await prisma.notificationRecipient.createMany({
                data: recipients
            })

            // 6. Send Emails asynchronously
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h3 style="color: #1e293b; margin-top: 0;">Xin chào sinh viên,</h3>
                    <p style="color: #475569;">Bạn nhận được thông báo bài tập mới trên hệ thống <strong>AITA</strong>:</p>
                    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 16px 0;">
                        <p style="margin: 0 0 8px 0; color: #334155;"><strong>Môn học:</strong> ${subjectLabel}</p>
                        <p style="margin: 0 0 8px 0; color: #334155;"><strong>Tên ${itemTypeLabel}:</strong> ${params.title}</p>
                        ${formattedDueDate ? `<p style="margin: 0; color: #dc2626;"><strong>Hạn nộp (Deadline):</strong> ${formattedDueDate}</p>` : ''}
                    </div>
                    <p style="color: #475569;">Vui lòng đăng nhập hệ thống AITA để làm bài và nộp đúng hạn.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">Trân trọng,<br>Hệ thống AITA Platform</p>
                </div>
            `

            const emailSubject = `[AITA] ${notifTitle}`
            const validEmails = students.map(s => s.Email).filter(Boolean) as string[]
            if (validEmails.length > 0) {
                this.emailService.sendEmail(validEmails, emailSubject, emailHtml).catch(err => {
                    logger.error(`Failed to send bulk email for exam ${params.examId}: ${err.message}`)
                })
            }

            logger.info(`Assignment notification sent to ${students.length} students for exam ${params.examId}`)

        } catch (error: any) {
            logger.error(`SendAssignmentNotificationUseCase error: ${error.message}`)
        }
    }
}

