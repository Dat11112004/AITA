// @ts-nocheck
import type { Request, Response } from 'express'
import { prisma } from '../database/prisma.js'
import { ok } from '../utils/response.js'

export async function adminReport(req: Request, res: Response) {
  const period = (req.query.period as string) || '30d'
  const days = period === '7d' ? 7 : period === 'semester' ? 120 : 30
  const since = new Date(Date.now() - days * 86400000)

  const [users, classes, exams, submissions, logs] = await Promise.all([
    prisma.user.count(),
    prisma.class.count(),
    prisma.exam.count({ where: { Id: { not: undefined } } }),
    prisma.submission.count({ where: { SubmittedAt: { gte: since } } }),
    prisma.auditLog.count({ where: { CreatedAt: { gte: since } } }),
  ])

  ok(res, {
    period,
    summary: { users, classes, exams, submissions, auditLogs: logs },
    chart: {
      labels: ['Users', 'Classes', 'Exams', 'Submissions'],
      values: [users, classes, exams, submissions],
    },
  })
}

export async function systemHealth(_req: Request, res: Response) {
  ok(res, {
    api: { status: 'up', latencyMs: 1 },
    database: { status: 'up' },
    aiEngine: { status: 'up', mode: process.env.AI_STUB_MODE !== 'false' ? 'stub' : 'live' },
  })
}
