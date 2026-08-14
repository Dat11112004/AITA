import type { Request, Response } from 'express'
import { CreateClassRequestDto, EnrollStudentRequestDto, UpdateClassNoteDto, UpdateClassRequestDto } from '../application/dtos/class.dto.js'
import { ListClassesUseCase } from '../application/use-cases/list-classes.use-case.js'
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case.js'
import { GetClassStudentsUseCase } from '../application/use-cases/get-class-students.use-case.js'
import { EnrollStudentUseCase } from '../application/use-cases/enroll-student.use-case.js'
import { UpdateClassNoteUseCase } from '../application/use-cases/update-class-note.use-case.js'
import { UpdateClassUseCase } from '../application/use-cases/update-class.use-case.js'
import { DeleteClassUseCase } from '../application/use-cases/delete-class.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { GetClassCodesBySubjectUseCase } from '../application/use-cases/get-class-codes-by-subject.use-case.js'
import { MESSAGES } from '../../../shared/constants/messages.js'
import { prisma } from '../../../database/prisma.js'
import { classEvents } from '../../../shared/infrastructure/events/class-events.js'
import { NodemailerService } from '../../../shared/infrastructure/email/nodemailer.service.js'

export class ClassesController extends BaseController {
  constructor(
    private readonly listClassesUseCase: ListClassesUseCase,
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly getClassStudentsUseCase: GetClassStudentsUseCase,
    private readonly enrollStudentUseCase: EnrollStudentUseCase,
    private readonly updateClassNoteUseCase: UpdateClassNoteUseCase,
    private readonly updateClassUseCase: UpdateClassUseCase,
    private readonly deleteClassUseCase: DeleteClassUseCase,
    private readonly getClassCodesBySubjectUseCase: GetClassCodesBySubjectUseCase,
    private readonly logger: ILogger
  ) {
    super()
  }

  async list(req: Request, res: Response): Promise<void> {
    this.logger.info(`Fetching classes for user ${req.user!.id}`)
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const result = await this.listClassesUseCase.execute({ user: req.user!, page, limit })
    this.ok(res, result, MESSAGES.CLASS_LIST_SUCCESS)
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.info(`Creating new class`)
    const dto = CreateClassRequestDto.from(req.body)
    if (req.user!.role === 'LECTURER') {
      dto.data.lecturerId = req.user!.id
    }
    const result = await this.createClassUseCase.execute(dto)
    this.created(res, result, MESSAGES.CLASS_CREATE_SUCCESS)
  }

  async getStudents(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Fetching students for class ${classId}`)
    const result = await this.getClassStudentsUseCase.execute(classId)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async enroll(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Enrolling student to class ${classId}`)
    const dto = EnrollStudentRequestDto.from(req.body)
    const result = await this.enrollStudentUseCase.execute({ classId, dto, user: req.user! })
    this.created(res, result, MESSAGES.SUCCESS)
  }

  async updateNote(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Updating note for class ${classId}`)
    const dto = UpdateClassNoteDto.from(req.body)
    const result = await this.updateClassNoteUseCase.execute({ classId, dto, user: req.user! })
    this.ok(res, result, MESSAGES.CLASS_NOTE_UPDATED)
  }

  async update(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Updating class ${classId}`)
    const dto = UpdateClassRequestDto.from(req.body)
    const result = await this.updateClassUseCase.execute({ classId, dto })
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async delete(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Deleting class ${classId}`)
    await this.deleteClassUseCase.execute(classId)
    this.ok(res, null, MESSAGES.SUCCESS)
  }

  async listClassCodes(req: Request, res: Response): Promise<void> {
    const semesterCode = req.query.semesterCode as string | undefined
    const subjectCode = req.query.subjectCode as string | undefined

    this.logger.info(`Fetching class codes for semester=${semesterCode}, subject=${subjectCode}`)

    const where: any = {}

    if (semesterCode) {
      const semester = await prisma.semester.findFirst({ where: { Code: semesterCode } })
      if (semester) where.SemesterId = semester.Id
    }

    if (subjectCode) {
      const subject = await prisma.subject.findFirst({ where: { SubjectCode: subjectCode } })
      if (subject) where.SubjectId = subject.Id
    }

    const classes = await (prisma as any).class.findMany({
      where,
      select: {
        Id: true,
        ClassCode: true,
        _count: { select: { StudentClass: true } }
      },
      orderBy: { ClassCode: 'asc' }
    })

    // Deduplicate by ClassCode — keep first occurrence (DB may have multiple records with same code)
    const seenCodes = new Set<string>()
    const result = classes
      .filter((c: any) => {
        if (!c.ClassCode || seenCodes.has(c.ClassCode)) return false
        seenCodes.add(c.ClassCode)
        return true
      })
      .map((c: any) => ({
        classId: c.Id,
        classCode: c.ClassCode,
        studentCount: c._count?.StudentClass || 0
      }))

    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async listSubjectsBySemester(req: Request, res: Response): Promise<void> {
    const semesterCode = req.query.semesterCode as string | undefined

    this.logger.info(`Fetching subjects for semester=${semesterCode}`)

    const where: any = {}
    if (semesterCode) {
      const semester = await prisma.semester.findFirst({ where: { Code: semesterCode } })
      if (semester) where.SemesterId = semester.Id
    }

    const classes = await (prisma as any).class.findMany({
      where,
      select: { Subject: { select: { Id: true, SubjectCode: true, SubjectName: true } } },
      distinct: ['SubjectId']
    })

    const subjects = classes
      .map((c: any) => c.Subject)
      .filter((s: any) => s !== null)

    this.ok(res, subjects, MESSAGES.SUCCESS)
  }

  async getClassCodesBySubject(req: Request, res: Response): Promise<void> {
    const subjectId = req.params.subjectId as string
    if (!subjectId) {
      throw new Error('SubjectId is required')
    }
    this.logger.info(`Fetching class codes for subject ${subjectId}`)
    const result = await this.getClassCodesBySubjectUseCase.execute(subjectId)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async listAnnouncements(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Fetching announcements for class ${classId}`)

    // 1. Resolve potential class / subject / exam
    const cls = await prisma.class.findFirst({
      where: {
        OR: [
          { Id: classId },
          { SubjectId: classId },
          { ClassCode: classId },
          { ExamClass: { some: { ExamId: classId } } }
        ]
      }
    })

    const targetRefIds = [classId]
    if (cls?.Id && !targetRefIds.includes(cls.Id)) targetRefIds.push(cls.Id)
    if (cls?.SubjectId && !targetRefIds.includes(cls.SubjectId)) targetRefIds.push(cls.SubjectId)
    if (cls?.ClassCode && !targetRefIds.includes(cls.ClassCode)) targetRefIds.push(cls.ClassCode)

    const rows = await prisma.notification.findMany({
      where: {
        ReferenceId: { in: targetRefIds },
        Type: { in: ['CLASS_ANNOUNCEMENT', 'CLASS', 'Announcement', 'ANNOUNCEMENT'] }
      },
      include: {
        User: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
            Avatar: true
          }
        }
      },
      orderBy: { CreatedAt: 'desc' },
      take: 50
    })

    const announcements = rows.map(r => ({
      id: r.Id,
      title: r.Title || 'Thông báo lớp học',
      content: r.Message,
      createdAt: r.CreatedAt,
      lecturer: {
        id: r.User?.Id || r.CreatedBy,
        name: r.User?.FullName || 'Giảng viên',
        email: r.User?.Email || '',
        avatar: r.User?.Avatar || null
      }
    }))

    this.ok(res, announcements, MESSAGES.SUCCESS)
  }

  async createAnnouncement(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    const userId = req.user!.id
    const { title, content } = req.body

    if (!content || !content.trim()) {
      throw new Error('Nội dung thông báo không được để trống')
    }

    // 1. Flexible lookup for class or subject or exam
    const cls = await prisma.class.findFirst({
      where: {
        OR: [
          { Id: classId },
          { SubjectId: classId },
          { ClassCode: classId },
          { ExamClass: { some: { ExamId: classId } } }
        ]
      },
      include: {
        Subject: true,
        StudentClass: {
          include: {
            User: {
              select: {
                Id: true,
                Email: true,
                FullName: true
              }
            }
          }
        }
      }
    })

    const subject = await prisma.subject.findFirst({
      where: {
        OR: [
          { Id: classId },
          { SubjectCode: classId }
        ]
      }
    })

    const classCode = cls?.ClassCode || subject?.SubjectCode || 'LỚP HỌC'
    const notifTitle = title?.trim() || `Thông báo lớp ${classCode}`

    const notif = await prisma.notification.create({
      data: {
        Title: notifTitle,
        Message: content.trim(),
        Type: 'CLASS_ANNOUNCEMENT',
        ReferenceId: classId,
        ReferenceType: 'CLASS',
        CreatedBy: userId,
        CreatedAt: new Date()
      },
      include: {
        User: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
            Avatar: true
          }
        }
      }
    })

    // Find student recipients
    let studentUsers = (cls?.StudentClass || []).map(sc => sc.User).filter(Boolean)
    if (studentUsers.length === 0) {
      studentUsers = await prisma.user.findMany({
        where: {
          OR: [
            { UserRole: { some: { Role: { RoleName: { in: ['STUDENT', 'Student', 'student'] } } } } },
            { StudentCode: { not: null } }
          ]
        },
        select: { Id: true, Email: true, FullName: true }
      })
    }

    const studentUserIds = [...new Set(studentUsers.map(u => u!.Id))]
    const validEmails = [...new Set(studentUsers.map(u => u!.Email).filter(Boolean))] as string[]

    if (studentUserIds.length > 0) {
      await prisma.notificationRecipient.createMany({
        data: studentUserIds.map(sId => ({
          NotificationId: notif.Id,
          UserId: sId,
          IsRead: false
        }))
      })
    }

    const lecturerName = notif.User?.FullName || (req.user as any)?.name || 'Giảng viên'
    const subjectCode = cls?.Subject?.SubjectCode || subject?.SubjectCode || ''
    const subjectName = cls?.Subject?.SubjectName || subject?.SubjectName || ''
    const subjectLabel = subjectCode && subjectName ? `${subjectName} (${subjectCode})` : (subjectCode || subjectName || 'môn học')

    const announcementDto = {
      id: notif.Id,
      title: notif.Title,
      content: notif.Message,
      createdAt: notif.CreatedAt,
      classId: classId,
      classCode: classCode,
      subjectCode: subjectCode,
      lecturer: {
        id: notif.User?.Id || userId,
        name: lecturerName,
        email: notif.User?.Email || (req.user as any)?.email || '',
        avatar: notif.User?.Avatar || null
      }
    }

    // 1. Broadcast Realtime SSE event
    classEvents.emit(`class_announcement:${classId}`, announcementDto)
    if (cls?.Id && cls.Id !== classId) {
      classEvents.emit(`class_announcement:${cls.Id}`, announcementDto)
    }

    // 2. Send email notification to all students in this class
    if (validEmails.length > 0) {
      const emailSubject = `[AITA] Thông báo mới lớp ${classCode} - Môn ${subjectCode || subjectName}`
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h2 style="color: #ea580c; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">AITA Platform</h2>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Hệ thống Hỗ trợ Đào tạo & Chấm điểm Tự động</p>
          </div>

          <p style="font-size: 15px; color: #334155; margin-top: 0;">Xin chào các bạn sinh viên lớp <strong>${classCode}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">Giảng viên <strong>${lecturerName}</strong> vừa đăng một thông báo mới trên bảng tin lớp học:</p>

          <div style="background-color: #fff7ed; padding: 18px 20px; border-radius: 12px; border-left: 5px solid #ea580c; margin: 20px 0;">
            <div style="font-size: 12px; font-weight: 700; color: #c2410c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
              Lớp: ${classCode} • Môn: ${subjectLabel}
            </div>
            <div style="font-size: 15px; color: #1e293b; line-height: 1.6; white-space: pre-wrap; font-weight: 500;">${content.trim()}</div>
          </div>

          <div style="margin: 28px 0; text-align: center;">
            <a href="https://feaita.edubridge.edu.vn/student/classes/${classId}" style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
              👉 Xem bảng tin lớp học trên AITA
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
            Email này được gửi tự động từ hệ thống AITA Platform. Vui lòng không trả lời trực tiếp email này.
          </p>
        </div>
      `

      try {
        const emailService = new NodemailerService()
        emailService.sendEmail(validEmails, emailSubject, emailHtml).catch(err => {
          console.error(`[ClassesController] Lỗi gửi email thông báo:`, err)
        })
      } catch (emailErr) {
        console.error(`[ClassesController] Lỗi email service:`, emailErr)
      }
    }

    this.created(res, announcementDto, 'Đã đăng thông báo thành công')
  }

  async deleteAnnouncement(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    const announcementId = req.params.announcementId as string
    const userId = req.user!.id
    const userRole = req.user!.role

    const notif = await prisma.notification.findUnique({
      where: { Id: announcementId }
    })

    if (!notif) {
      this.ok(res, null, MESSAGES.SUCCESS)
      return
    }

    if (userRole !== 'ADMIN' && notif.CreatedBy !== userId) {
      throw new Error('Bạn không có quyền xoá thông báo này')
    }

    await prisma.notificationRecipient.deleteMany({
      where: { NotificationId: announcementId }
    })
    await prisma.notification.delete({
      where: { Id: announcementId }
    })

    // Broadcast Realtime deletion event
    classEvents.emit(`class_announcement_deleted:${classId}`, { announcementId })

    this.ok(res, null, 'Đã xoá thông báo thành công')
  }

  async streamAnnouncements(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    // Send initial ping
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', classId })}\n\n`)

    const onNewAnnouncement = (data: any) => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'NEW_ANNOUNCEMENT', data })}\n\n`)
      } catch (e) { }
    }

    const onDeleteAnnouncement = (data: any) => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'DELETE_ANNOUNCEMENT', data })}\n\n`)
      } catch (e) { }
    }

    classEvents.on(`class_announcement:${classId}`, onNewAnnouncement)
    classEvents.on(`class_announcement_deleted:${classId}`, onDeleteAnnouncement)

    // Keepalive ping every 25 seconds
    const keepAliveTimer = setInterval(() => {
      try {
        res.write(`: keepalive\n\n`)
      } catch (e) {
        clearInterval(keepAliveTimer)
      }
    }, 25000)

    req.on('close', () => {
      clearInterval(keepAliveTimer)
      classEvents.removeListener(`class_announcement:${classId}`, onNewAnnouncement)
      classEvents.removeListener(`class_announcement_deleted:${classId}`, onDeleteAnnouncement)
    })
  }
}
