import type { Request, Response } from 'express'
import { z } from 'zod'
import { AIJobStatus, AIJobType, AssignmentType } from '@prisma/client'
import { prisma } from '../database/prisma.js'
import { badRequest, forbidden, notFound } from '../utils/errors.js'
import { ok } from '../utils/response.js'
import { aiService } from '../services/ai.service.js'
import { param } from '../utils/params.js'
import { mapAIReview, mapAssignment } from '../utils/mappers.js'

const typeMap: Record<string, AssignmentType> = {
  quiz: 'QUIZ',
  coding: 'CODING',
  group: 'GROUP',
}

async function waitForJob(id: string, maxMs = 65000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const job = await prisma.aIJob.findUnique({ where: { id } })
    if (job && (job.status === 'COMPLETED' || job.status === 'FAILED')) return job
    await new Promise((r) => setTimeout(r, 300))
  }
  return prisma.aIJob.findUnique({ where: { id } })
}

export async function generateExercise(req: Request, res: Response) {
  const input = z
    .object({
      classId: z.string().optional(),
      type: z.enum(['quiz', 'coding', 'group']),
      topic: z.string().min(1),
      difficulty: z.string().optional(),
      questionCount: z.coerce.number().optional(),
      language: z.string().optional(),
      extra: z.string().optional(),
    })
    .parse(req.body)

  const job = await prisma.aIJob.create({
    data: {
      type: AIJobType.EXERCISE_GENERATION,
      status: AIJobStatus.PENDING,
      createdById: req.user!.id,
      input: JSON.stringify(input),
    },
  })
  aiService.schedule(job.id)

  const completed = await waitForJob(job.id)
  if (!completed || completed.status === 'FAILED') {
    throw badRequest(completed?.errorMessage ?? 'AI tạo bài thất bại')
  }

  const result = completed.output ? JSON.parse(completed.output) : null

  let draftAssignment = null
  if (input.classId && result) {
    draftAssignment = await prisma.assignment.create({
      data: {
        classId: input.classId,
        title: result.title ?? `Bài tập ${input.topic}`,
        description: result.description,
        type: typeMap[input.type],
        status: 'PENDING_AI_REVIEW',
        content: JSON.stringify(result.content ?? result),
        maxScore: 10,
        dueAt: new Date(Date.now() + 14 * 86400000),
      },
    })
    await prisma.aIJob.update({
      where: { id: job.id },
      data: { assignmentId: draftAssignment.id },
    })
  }

  ok(res, {
    job: completed,
    result,
    assignment: draftAssignment ? mapAssignment(draftAssignment) : null,
  })
}

export async function saveAssignmentFromAI(req: Request, res: Response) {
  const body = z
    .object({
      classId: z.string(),
      jobId: z.string().optional(),
      title: z.string().min(2),
      description: z.string().optional(),
      type: z.enum(['quiz', 'coding', 'group']),
      content: z.unknown().optional(),
      publish: z.boolean().optional(),
    })
    .parse(req.body)

  const assignment = await prisma.assignment.create({
    data: {
      classId: body.classId,
      title: body.title,
      description: body.description,
      type: typeMap[body.type],
      status: body.publish ? 'PUBLISHED' : 'DRAFT',
      content: body.content ? JSON.stringify(body.content) : null,
      maxScore: 10,
      dueAt: new Date(Date.now() + 14 * 86400000),
    },
    include: { class: true, _count: { select: { submissions: true } } },
  })

  if (body.jobId) {
    await prisma.aIJob.update({ where: { id: body.jobId }, data: { assignmentId: assignment.id } })
  }

  ok(res, mapAssignment(assignment), 201)
}

export async function assessSubmission(req: Request, res: Response) {
  const submissionId = param(req, 'submissionId')
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { class: true } } },
  })
  if (!sub) throw notFound('Bài nộp không tồn tại')
  if (req.user!.role === 'LECTURER' && sub.assignment.class.lecturerId !== req.user!.id) {
    throw forbidden()
  }

  const job = await prisma.aIJob.create({
    data: {
      type: AIJobType.ASSESSMENT,
      status: AIJobStatus.PENDING,
      createdById: req.user!.id,
      submissionId: sub.id,
    },
  })
  aiService.schedule(job.id)
  const completed = await waitForJob(job.id)
  if (!completed?.output) throw badRequest(completed?.errorMessage ?? 'AI chấm bài thất bại')

  const parsed = JSON.parse(completed.output) as { aiScore?: number; feedback?: object }
  const aiScore = parsed.aiScore ?? 0
  const updated = await prisma.submission.update({
    where: { id: sub.id },
    data: {
      aiScore,
      aiFeedback: JSON.stringify(parsed.feedback ?? parsed),
      status: 'AI_GRADED',
    },
    include: { student: true, assignment: true },
  })

  ok(res, { submission: updated, aiScore, feedback: parsed.feedback ?? parsed })
}

export async function learningFeedback(req: Request, res: Response) {
  const studentId = param(req, 'studentId')
  if (req.user!.role === 'STUDENT' && req.user!.id !== studentId) throw forbidden()
  const result = await aiService.learningFeedback(studentId)
  ok(res, result)
}

export async function listReviews(_req: Request, res: Response) {
  const jobs = await prisma.aIJob.findMany({
    where: {
      status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] },
    },
    include: { review: true, assignment: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const pending = jobs.filter((j: any) => !j.review || j.review.approved === null)
  ok(res, pending.map(mapAIReview))
}

export async function reviewJob(req: Request, res: Response) {
  const { approved, note } = z
    .object({ approved: z.boolean(), note: z.string().optional() })
    .parse(req.body)

  const jobId = param(req, 'jobId')
  const job = await prisma.aIJob.findUnique({ where: { id: jobId } })
  if (!job) throw notFound()

  await prisma.aIReview.upsert({
    where: { aiJobId: job.id },
    create: {
      aiJobId: job.id,
      reviewerId: req.user!.id,
      approved,
      note,
      reviewedAt: new Date(),
    },
    update: { approved, note, reviewerId: req.user!.id, reviewedAt: new Date() },
  })

  await prisma.aIJob.update({
    where: { id: job.id },
    data: { status: approved ? AIJobStatus.APPROVED : AIJobStatus.REJECTED },
  })

  if (approved && job.assignmentId) {
    await prisma.assignment.update({
      where: { id: job.assignmentId },
      data: { status: 'PUBLISHED' },
    })
  }

  ok(res, { jobId: job.id, approved })
}

export async function getConfig(_req: Request, res: Response) {
  const settings = await prisma.systemSetting.findMany()
  const map = Object.fromEntries(settings.map((s: any) => [s.key, s.value]))
  ok(res, {
    aiEndpoint: map.aiEndpoint ?? '',
    aiModel: map.aiModel ?? 'stub',
    aiTimeout: map.aiTimeout ?? '60',
    aiStubMode: map.aiStubMode ?? 'true',
  })
}

export async function updateConfig(req: Request, res: Response) {
  const body = req.body as Record<string, string>
  const keys = ['aiEndpoint', 'aiModel', 'aiTimeout', 'aiStubMode']
  for (const key of keys) {
    if (body[key] !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: String(body[key]) },
        update: { value: String(body[key]) },
      })
    }
  }
  ok(res, body)
}
