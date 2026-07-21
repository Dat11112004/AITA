import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { MESSAGES } from '../../../shared/constants/messages.js'
import { prisma } from '../../../database/prisma.js'
import { v4 as uuidv4 } from 'uuid'
export class StudentPortalController extends BaseController {
  constructor(private readonly logger: ILogger) {
    super()
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    const studentId = req.user!.id
    this.logger.debug(`Fetching student dashboard for ${studentId}`)
    
    // Aggregate data: Assignments due soon, classes, notifications
    const rawUpcomingAssignments = await prisma.exam.findMany({
      where: {
        Status: 'Published',
        ExamClass: {
          some: {
            Class: {
              StudentClass: {
                some: { UserId: studentId }
              }
            }
          }
        },
        DueDate: {
          gte: new Date()
        }
      },
      orderBy: { DueDate: 'asc' },
      take: 5
    })

    const upcomingAssignments = rawUpcomingAssignments.map(a => ({
      id: a.Id,
      title: a.Title,
      due: a.DueDate,
      type: a.ExamType
    }))

    // Auto-generate deadline warnings
    const now = new Date()
    for (const a of rawUpcomingAssignments) {
      if (!a.DueDate) continue;
      const daysLeft = Math.ceil((a.DueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0 && daysLeft <= 5) {
        const title = `Nhắc nhở Deadline: ${a.Title}`
        const msg = `Bài tập/đề thi ${a.Title} sẽ hết hạn trong ${daysLeft} ngày nữa.`
        
        // Check if we already created this exact notification recently
        const exists = await prisma.notification.findFirst({
           where: {
             Title: title,
             NotificationRecipient: { some: { UserId: studentId } }
           }
        })
        
        if (!exists) {
           const notificationId = uuidv4();
           await prisma.notification.create({
             data: {
               Id: notificationId,
               Title: title,
               Message: msg,
               Type: 'DEADLINE_WARNING',
               ReferenceId: a.Id,
               ReferenceType: 'Exam',
               CreatedBy: studentId,
               CreatedAt: new Date(),
               NotificationRecipient: {
                 create: {
                   UserId: studentId,
                   IsRead: false
                 }
               }
             }
           })
        }
      }
    }

    const enrolledClasses = await prisma.class.findMany({
      where: {
        StudentClass: {
          some: { UserId: studentId }
        }
      },
      include: {
        Subject: true,
        InstructorClass: {
          include: { User: true }
        }
      }
    })

    const unreadNotifications = await prisma.notificationRecipient.count({
      where: {
        UserId: studentId,
        IsRead: false
      }
    })

    const result = {
      upcomingAssignments,
      enrolledClasses: enrolledClasses.map(c => ({
        id: c.Id,
        classCode: c.ClassCode,
        subject: {
          id: c.Subject?.Id,
          code: c.Subject?.SubjectCode,
          name: c.Subject?.SubjectName
        },
        lecturers: c.InstructorClass.map(ic => ({
          id: ic.User.Id,
          name: ic.User.FullName
        }))
      })),
      unreadNotifications
    }

    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async getSubjects(req: Request, res: Response): Promise<void> {
    const studentId = req.user!.id
    this.logger.debug(`Fetching student subjects for ${studentId}`)
    
    // Find all classes the student is enrolled in, then map to unique subjects
    const enrolledClasses = await prisma.class.findMany({
      where: {
        StudentClass: {
          some: { UserId: studentId }
        }
      },
      include: {
        Subject: true,
        InstructorClass: {
          include: { User: true }
        }
      }
    })

    const subjectsMap = new Map<string, any>()
    for (const c of enrolledClasses) {
      if (c.Subject && !subjectsMap.has(c.Subject.Id)) {
        // Collect lecturers from InstructorClass
        const lecturers = c.InstructorClass.map(ic => ({
          id: ic.User.Id,
          name: ic.User.FullName,
          avatar: ic.User.Avatar || null,
        }))

        subjectsMap.set(c.Subject.Id, {
          id: c.Subject.Id,
          code: c.Subject.SubjectCode,
          name: c.Subject.SubjectName,
          description: c.Subject.Description,
          lecturers,
        })
      }
    }

    this.ok(res, Array.from(subjectsMap.values()), MESSAGES.SUCCESS)
  }

  async getClassDetail(req: Request, res: Response): Promise<void> {
    const studentId = req.user!.id
    const classId = req.params.id as string
    this.logger.debug(`Fetching class detail ${classId} for student ${studentId}`)

    // Ensure student is enrolled in this class
    const cls = await prisma.class.findFirst({
      where: {
        Id: classId,
        StudentClass: {
          some: { UserId: studentId }
        }
      },
      include: {
        Subject: true,
        InstructorClass: {
          include: { User: true }
        },
        ExamClass: {
          include: {
            Exam: true
          }
        }
      }
    })

    if (!cls) {
      res.status(404).json({ success: false, message: 'Không tìm thấy lớp học hoặc bạn chưa đăng ký lớp này' })
      return;
    }

    const result = {
      id: cls.Id,
      classCode: cls.ClassCode,
      subject: cls.Subject ? {
        id: cls.Subject.Id,
        code: cls.Subject.SubjectCode,
        name: cls.Subject.SubjectName
      } : null,
      lecturers: cls.InstructorClass.map(ic => ({
        id: ic.User.Id,
        name: ic.User.FullName,
        email: ic.User.Email
      })),
      assignments: cls.ExamClass.map(ec => ({
        id: ec.Exam.Id,
        title: ec.Exam.Title,
        description: ec.Exam.Description,
        status: ec.Exam.Status,
        dueDate: ec.DueDate || ec.Exam.DueDate,
        totalPoints: ec.Exam.TotalPoints,
        type: ec.Exam.ExamType
      }))
    }

    this.ok(res, result, MESSAGES.SUCCESS)
  }
}

