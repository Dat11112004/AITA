import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { MESSAGES } from '../../../shared/constants/messages.js'
import { prisma } from '../../../database/prisma.js'

export class StudentPortalController extends BaseController {
  constructor(private readonly logger: ILogger) {
    super()
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    const studentId = req.user!.id
    this.logger.debug(`Fetching student dashboard for ${studentId}`)

    // Fetch student's existing submissions to filter out completed assignments
    const studentSubmissions = await prisma.submission.findMany({
      where: { StudentId: studentId },
      select: { ExamId: true }
    });
    const submittedExamIds = studentSubmissions.map(s => s.ExamId).filter(Boolean) as string[];

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
        },
        Id: {
          notIn: submittedExamIds
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

    // 1. Find class by Id, SubjectId, ClassCode, or ExamId
    let cls = await prisma.class.findFirst({
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
        InstructorClass: {
          include: { User: true }
        },
        StudentClass: {
          include: { User: true },
          orderBy: { EnrolledAt: 'asc' }
        },
        ExamClass: {
          include: {
            Exam: true
          }
        }
      }
    })

    // 2. If no direct class record matches, resolve via Subject or Exam and construct class view
    if (!cls) {
      const subject = await prisma.subject.findUnique({ where: { Id: classId } })
      const exam = await prisma.exam.findUnique({ where: { Id: classId }, include: { Subject: true } })

      const activeStudents = await prisma.user.findMany({
        where: {
          OR: [
            { UserRole: { some: { Role: { RoleName: { in: ['STUDENT', 'Student', 'student'] } } } } },
            { StudentCode: { not: null } }
          ]
        },
        take: 50
      })

      const studentList = activeStudents.map(s => ({
        id: s.Id,
        studentCode: s.StudentCode || s.Id,
        fullName: s.FullName || 'Chưa cập nhật',
        email: s.Email,
        avatar: s.Avatar || null,
        joinedAt: s.LastLoginAt ? s.LastLoginAt.toISOString() : null
      }))

      const result = {
        id: classId,
        classCode: subject?.SubjectCode || exam?.Subject?.SubjectCode || 'LỚP HỌC',
        subject: (subject || exam?.Subject) ? {
          id: subject?.Id || exam?.Subject?.Id,
          code: subject?.SubjectCode || exam?.Subject?.SubjectCode,
          name: subject?.SubjectName || exam?.Subject?.SubjectName
        } : null,
        lecturers: [],
        students: studentList,
        assignments: exam ? [{
          id: exam.Id,
          title: exam.Title,
          description: exam.Description,
          status: exam.Status,
          dueDate: exam.DueDate,
          totalPoints: exam.TotalPoints,
          type: exam.ExamType
        }] : []
      }

      this.ok(res, result, MESSAGES.SUCCESS)
      return
    }

    const c = cls as any

    // 3. Extract enrolled students or fallback to active students in system
    let studentList = (c.StudentClass || []).map((sc: any) => ({
      id: sc.User.Id,
      studentCode: sc.User.StudentCode || sc.User.Id,
      fullName: sc.User.FullName || 'Chưa cập nhật',
      email: sc.User.Email,
      avatar: sc.User.Avatar || null,
      joinedAt: sc.EnrolledAt ? sc.EnrolledAt.toISOString() : null
    }))

    if (studentList.length === 0) {
      const activeStudents = await prisma.user.findMany({
        where: {
          OR: [
            { UserRole: { some: { Role: { RoleName: { in: ['STUDENT', 'Student', 'student'] } } } } },
            { StudentCode: { not: null } }
          ]
        },
        take: 50
      })
      studentList = activeStudents.map(s => ({
        id: s.Id,
        studentCode: s.StudentCode || s.Id,
        fullName: s.FullName || 'Chưa cập nhật',
        email: s.Email,
        avatar: s.Avatar || null,
        joinedAt: s.LastLoginAt ? s.LastLoginAt.toISOString() : null
      }))
    }

    const result = {
      id: c.Id,
      classCode: c.ClassCode,
      subject: c.Subject ? {
        id: c.Subject.Id,
        code: c.Subject.SubjectCode,
        name: c.Subject.SubjectName
      } : null,
      lecturers: (c.InstructorClass || []).map((ic: any) => ({
        id: ic.User.Id,
        name: ic.User.FullName,
        email: ic.User.Email,
        avatar: ic.User.Avatar || null
      })),
      students: studentList,
      assignments: (c.ExamClass || []).map((ec: any) => ({
        id: ec.Exam?.Id,
        title: ec.Exam?.Title,
        description: ec.Exam?.Description,
        status: ec.Exam?.Status,
        dueDate: ec.DueDate || ec.Exam?.DueDate,
        totalPoints: ec.Exam?.TotalPoints,
        type: ec.Exam?.ExamType
      }))
    }

    this.ok(res, result, MESSAGES.SUCCESS)
  }
}

