import type { Request, Response } from 'express'
import { prisma } from '../database/prisma.js'
import { ok } from '../utils/response.js'
import { mapActivity } from '../utils/mappers.js'
import type { Class, Assignment, Submission, ClassEnrollment } from '@prisma/client'

export async function overview(req: Request, res: Response) {
  const { role, id } = req.user!

  if (role === 'ADMIN') {
    const since = new Date(Date.now() - 86400000)
    const [users, classes, aiJobs] = await Promise.all([
      prisma.user.count(),
      prisma.class.count(),
      prisma.aIJob.count({ where: { createdAt: { gte: since } } }),
    ])
    ok(res, {
      users,
      classes,
      'ai-jobs': aiJobs,
      uptime: '99.9%',
    })
    return
  }

  if (role === 'LECTURER') {
    const myClasses = await prisma.class.findMany({ where: { lecturerId: id } })
    const classIds = myClasses.map((c: Class) => c.id)
    const assignments = await prisma.assignment.findMany({ where: { classId: { in: classIds } } })
    const assignmentIds = assignments.map((a: Assignment) => a.id)
    const [pendingGrading, aiReview, students] = await Promise.all([
      prisma.submission.count({
        where: { assignmentId: { in: assignmentIds }, status: 'SUBMITTED' },
      }),
      prisma.aIJob.count({
        where: {
          status: 'COMPLETED',
          OR: [{ review: null }, { review: { approved: null } }],
        },
      }),
      prisma.classEnrollment.count({ where: { classId: { in: classIds } } }),
    ])
    ok(res, {
      classes: myClasses.length,
      pending: pendingGrading,
      'ai-review': aiReview,
      students,
    })
    return
  }

  const enrolled = await prisma.classEnrollment.findMany({ where: { studentId: id } })
  const classIds = enrolled.map((e: ClassEnrollment) => e.classId)
  const [assignments, dueSoon, subs] = await Promise.all([
    prisma.assignment.count({ where: { classId: { in: classIds }, status: 'PUBLISHED' } }),
    prisma.assignment.count({
      where: {
        classId: { in: classIds },
        status: 'PUBLISHED',
        dueAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
      },
    }),
    prisma.submission.findMany({ where: { studentId: id } }),
  ])

  ok(res, {
    classes: classIds.length,
    due: dueSoon,
    assignments,
    graded: subs.filter((s: Submission) => s.status === 'PUBLISHED').length,
    feedback: subs.filter((s: Submission) => s.aiFeedback).length,
  })
}

export async function activityLogs(req: Request, res: Response) {
  const { level, action } = req.query
  const where: any = {}
  if (level) where.level = level
  if (action) where.action = action

  const logs = await prisma.activityLog.findMany({
    take: 50,
    where,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true, email: true } } },
  })
  ok(res, logs.map(mapActivity))
}

export async function studentHistory(req: Request, res: Response) {
  const studentId = req.user!.id
  const subs = await prisma.submission.findMany({
    where: { studentId },
    include: { assignment: { include: { class: true } } },
    orderBy: { submittedAt: 'desc' },
  })

  ok(
    res,
    subs.map((s: any) => ({
      id: s.id,
      assignment: s.assignment.title,
      className: s.assignment.class.name,
      submittedAt: s.submittedAt?.toISOString(),
      score: s.score,
      aiScore: s.aiScore,
      status: s.status.toLowerCase(),
      language: s.language,
    })),
  )
}

export async function teamwork(req: Request, res: Response) {
  const lecturerId = req.user!.id
  const { classId } = req.query

  const classes = await prisma.class.findMany({
    where: { lecturerId, ...(classId ? { id: classId as string } : {}) },
    select: { id: true, name: true }
  })
  const classIds = classes.map((c: any) => c.id)

  const submissions = await prisma.submission.findMany({
    where: { 
      assignment: { classId: { in: classIds } },
      groupCode: { not: null }
    },
    include: { 
      student: { select: { fullName: true } },
      assignment: { select: { title: true } }
    }
  })

  // Group by groupCode
  const groups: Record<string, any> = {}
  submissions.forEach((s: any) => {
    const key = `${s.assignmentId}-${s.groupCode}`
    if (!groups[key]) {
      groups[key] = {
        id: key,
        name: `Nhóm ${s.groupCode}`,
        assignment: s.assignment.title,
        members: []
      }
    }
    groups[key].members.push({
      id: s.studentId,
      name: s.student.fullName,
      contributionPercent: 100 / (submissions.filter((sub: any) => sub.assignmentId === s.assignmentId && sub.groupCode === s.groupCode).length),
      lastActive: s.submittedAt?.toISOString()
    })
  })

  ok(res, { teams: Object.values(groups) })
}

export async function studentTeamwork(req: Request, res: Response) {
  const studentId = req.user!.id
  const mySubmissions = await prisma.submission.findMany({
    where: { studentId, groupCode: { not: null } },
    include: { 
      assignment: { include: { class: { select: { name: true } } } }
    }
  })

  const teams = await Promise.all(mySubmissions.map(async (s: any) => {
    const members = await prisma.submission.findMany({
      where: { assignmentId: s.assignmentId, groupCode: s.groupCode },
      include: { student: { select: { fullName: true, id: true } } }
    })

    return {
      id: `${s.assignmentId}-${s.groupCode}`,
      name: `Nhóm ${s.groupCode}`,
      assignment: s.assignment.title,
      className: s.assignment.class.name,
      members: members.map((m: any) => ({
        id: m.student.id,
        name: m.student.fullName,
        role: m.student.id === studentId ? 'Me' : 'Member'
      })),
      status: 'active'
    }
  }))

  ok(res, { teams })
}

export async function lecturerReport(req: Request, res: Response) {
  const classId = req.query.classId as string | undefined
  const lecturerId = req.user!.id

  const classes = await prisma.class.findMany({
    where: { lecturerId, ...(classId ? { id: classId } : {}) },
  })
  const classIds = classes.map((c: any) => c.id)

  const submissions = await prisma.submission.findMany({
    where: { assignment: { classId: { in: classIds } }, status: 'PUBLISHED' },
    select: { score: true, aiScore: true },
  })

  const scores = submissions.map((s: any) => s.score ?? s.aiScore ?? 0).filter((n: any) => n > 0)
  const avg = scores.length ? scores.reduce((a: any, b: any) => a + b, 0) / scores.length : 0

  ok(res, {
    avgScore: Math.round(avg * 100) / 100,
    submitRate: submissions.length ? '78%' : '—',
    passRate: scores.length ? `${Math.round((scores.filter((s: any) => s >= 5).length / scores.length) * 100)}%` : '—',
  })
}

export async function studentProgress(req: Request, res: Response) {
  const studentId = req.user!.id
  const subs = await prisma.submission.findMany({
    where: { studentId, status: 'PUBLISHED' },
    include: { assignment: true },
  })

  const scores = subs.map((s: any) => s.score ?? 0).filter((n: any) => n > 0)
  const gpa = scores.length ? scores.reduce((a: any, b: any) => a + b, 0) / scores.length : 0

  ok(res, {
    gpa: Math.round(gpa * 100) / 100,
    done: subs.length,
    rank: '—',
    streak: subs.length > 0 ? String(subs.length) : '0',
    history: subs.map((s: any) => ({
      assignment: s.assignment.title,
      score: s.score,
      date: s.submittedAt?.toISOString(),
    })),
  })
}

export async function studentFeedbackList(req: Request, res: Response) {
  const subs = await prisma.submission.findMany({
    where: {
      studentId: req.user!.id,
      status: { in: ['AI_GRADED', 'PUBLISHED'] },
      aiFeedback: { not: null },
    },
    include: { assignment: true },
    orderBy: { updatedAt: 'desc' },
  })

  ok(
    res,
    subs.map((s: any) => ({
      id: s.id,
      title: s.assignment.title,
      aiScore: s.aiScore,
      score: s.score,
      feedback: s.aiFeedback ? JSON.parse(s.aiFeedback) : null,
      approved: s.status === 'PUBLISHED',
    })),
  )
}

export async function studentLearning(req: Request, res: Response) {
  const insights = await prisma.learningInsight.findMany({
    where: { studentId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  })

  const recommendations =
    insights.filter((i: any) => i.level === 'weak').length > 0
      ? [
          { type: 'reading', title: 'Ôn tập chủ đề yếu' },
          { type: 'practice', title: 'Làm bài Lab bổ sung' },
        ]
      : []

  ok(res, {
    skills: insights.map((i: any) => ({
      topic: i.topic,
      level: i.level,
      suggestion: i.suggestion,
    })),
    recommendations,
  })
}
