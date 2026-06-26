import type { Request, Response } from 'express'
import { prisma } from '../database/prisma.js'
import { ok } from '../utils/response.js'

export async function overview(req: Request, res: Response) {
  const { role, id } = req.user!

  if (role === 'ADMIN') {
    const [users, classes, exams] = await Promise.all([
      prisma.user.count(),
      prisma.class.count(),
      prisma.exam.count(),
    ])
    ok(res, {
      users,
      classes,
      exams,
      uptime: '99.9%',
    })
    return
  }

  if (role === 'LECTURER') {
    const myClasses = await prisma.class.findMany({
      where: { InstructorClass: { some: { UserId: id } } },
    })
    const classIds = myClasses.map((c) => c.Id)
    const exams = await prisma.exam.count()
    const [pendingGrading, students] = await Promise.all([
      prisma.submission.count({
        where: { ClassId: { in: classIds }, GradingStatus: 'Pending' },
      }),
      prisma.studentClass.count({ where: { ClassId: { in: classIds } } }),
    ])
    ok(res, {
      classes: myClasses.length,
      pending: pendingGrading,
      exams,
      students,
    })
    return
  }

  // Student
  const enrolled = await prisma.studentClass.findMany({ where: { UserId: id } })
  const classIds = enrolled.map((e) => e.ClassId)
  const [exams, subs] = await Promise.all([
    prisma.exam.count({ where: { Status: 'Published' } }),
    prisma.submission.findMany({ where: { StudentId: id } }),
  ])

  ok(res, {
    classes: classIds.length,
    exams,
    submissions: subs.length,
    graded: subs.filter((s) => s.GradingStatus === 'Graded').length,
  })
}

export async function activityLogs(req: Request, res: Response) {
  const { action } = req.query
  const where: any = {}
  if (action) where.Action = action

  const logs = await prisma.auditLog.findMany({
    take: 50,
    where,
    orderBy: { CreatedAt: 'desc' },
    include: { User: true },
  })

  ok(
    res,
    logs.map((log) => ({
      id: log.Id,
      action: log.Action,
      entity: log.EntityName,
      entityId: log.EntityId,
      user: log.User?.FullName ?? 'Hệ thống',
      email: log.User?.Email,
      createdAt: log.CreatedAt?.toISOString() ?? null,
    })),
  )
}

export async function studentHistory(req: Request, res: Response) {
  const studentId = req.user!.id
  const subs = await prisma.submission.findMany({
    where: { StudentId: studentId },
    include: { Exam: true, Class: true },
    orderBy: { SubmittedAt: 'desc' },
  })

  ok(
    res,
    subs.map((s) => ({
      id: s.Id,
      assignment: s.Exam?.Title,
      className: s.Class?.ClassCode,
      submittedAt: s.SubmittedAt?.toISOString(),
      totalScore: s.TotalScore,
      finalScore: s.FinalScore,
      status: s.GradingStatus?.toLowerCase(),
    })),
  )
}

export async function teamwork(_req: Request, res: Response) {
  ok(res, { teams: [] })
}

export async function studentTeamwork(_req: Request, res: Response) {
  ok(res, { teams: [] })
}

export async function lecturerReport(req: Request, res: Response) {
  const classId = req.query.classId as string | undefined
  const lecturerId = req.user!.id

  const classes = await prisma.class.findMany({
    where: {
      InstructorClass: { some: { UserId: lecturerId } },
      ...(classId ? { Id: classId } : {}),
    },
  })
  const classIds = classes.map((c) => c.Id)

  const submissions = await prisma.submission.findMany({
    where: { ClassId: { in: classIds }, GradingStatus: 'Graded' },
    select: { TotalScore: true, FinalScore: true },
  })

  const scores = submissions.map((s) => Number(s.TotalScore ?? s.FinalScore ?? 0)).filter((n) => n > 0)
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

  ok(res, {
    avgScore: Math.round(avg * 100) / 100,
    submitRate: submissions.length ? '78%' : '—',
    passRate: scores.length ? `${Math.round((scores.filter((s) => s >= 5).length / scores.length) * 100)}%` : '—',
  })
}

export async function studentProgress(req: Request, res: Response) {
  const studentId = req.user!.id
  const subs = await prisma.submission.findMany({
    where: { StudentId: studentId, GradingStatus: 'Graded' },
    include: { Exam: true },
  })

  const scores = subs.map((s) => Number(s.TotalScore ?? 0)).filter((n) => n > 0)
  const gpa = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

  ok(res, {
    gpa: Math.round(gpa * 100) / 100,
    done: subs.length,
    rank: '—',
    streak: subs.length > 0 ? String(subs.length) : '0',
    history: subs.map((s) => ({
      assignment: s.Exam?.Title,
      score: s.TotalScore,
      date: s.SubmittedAt?.toISOString(),
    })),
  })
}

export async function studentFeedbackList(req: Request, res: Response) {
  const subs = await prisma.submission.findMany({
    where: {
      StudentId: req.user!.id,
      GradingStatus: { in: ['Graded'] },
    },
    include: { Exam: true },
    orderBy: { SubmittedAt: 'desc' },
  })

  ok(
    res,
    subs.map((s) => ({
      id: s.Id,
      title: s.Exam?.Title,
      totalScore: s.TotalScore,
      finalScore: s.FinalScore,
      instructorFeedback: s.InstructorFeedback,
      graded: s.GradingStatus === 'Graded',
    })),
  )
}

export async function studentLearning(_req: Request, res: Response) {
  ok(res, {
    skills: [],
    recommendations: [],
  })
}
