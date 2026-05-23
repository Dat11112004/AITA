import type { Request, Response } from 'express'
import { prisma } from '../database/prisma.js'
import { ok } from '../utils/response.js'

export async function adminReport(req: Request, res: Response) {
  const period = (req.query.period as string) || '30d'
  const days = period === '7d' ? 7 : period === 'semester' ? 120 : 30
  const since = new Date(Date.now() - days * 86400000)

  const [users, classes, aiJobs, submissions, logs] = await Promise.all([
    prisma.user.count(),
    prisma.class.count(),
    prisma.aIJob.count({ where: { createdAt: { gte: since } } }),
    prisma.submission.count({ where: { createdAt: { gte: since } } }),
    prisma.activityLog.count({ where: { createdAt: { gte: since } } }),
  ])

  ok(res, {
    period,
    summary: { users, classes, aiJobs, submissions, activityLogs: logs },
    chart: {
      labels: ['Users', 'Classes', 'AI Jobs', 'Submissions'],
      values: [users, classes, aiJobs, submissions],
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
