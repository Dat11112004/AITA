import type { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../database/prisma.js'
import { badRequest, notFound } from '../utils/errors.js'
import { ok } from '../utils/response.js'
import { aiService } from '../services/ai.service.js'
import { param } from '../utils/params.js'

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

  const result = await aiService.generateExercise(input)

  ok(res, {
    result,
    assignment: null,
  })
}

export async function saveAssignmentFromAI(req: Request, res: Response) {
  const body = z
    .object({
      classId: z.string(),
      title: z.string().min(2),
      description: z.string().optional(),
      type: z.enum(['quiz', 'coding', 'group']),
      content: z.unknown().optional(),
      publish: z.boolean().optional(),
    })
    .parse(req.body)

  const assignment = await prisma.exam.create({
    data: {
      Title: body.title,
      Description: body.description,
      ExamType: body.type.toUpperCase() as any,
      Status: body.publish ? 'Published' : 'Draft',
      AiGeneratedContent: body.content ? JSON.stringify(body.content) : null,
      TotalPoints: 10,
      Duration: 14 * 24 * 60,
      CreatedBy: req.user!.id,
    },
  })

  ok(res, {
    id: assignment.Id,
    title: assignment.Title,
    description: assignment.Description,
    type: assignment.ExamType?.toLowerCase(),
    status: assignment.Status?.toLowerCase(),
  }, 201)
}

export async function assessSubmission(req: Request, res: Response) {
  const submissionId = param(req, 'submissionId')
  const sub = await prisma.submission.findUnique({
    where: { Id: submissionId },
    include: { Exam: true, Class: true },
  })
  if (!sub) throw notFound('Bài nộp không tồn tại')

  const result = await aiService.assess(
    '',
    undefined,
    sub.Exam?.Title ?? undefined,
    sub.Exam?.Description ?? undefined,
  )

  ok(res, { submission: sub, aiScore: (result as any).aiScore, feedback: (result as any).feedback })
}

export async function learningFeedback(req: Request, res: Response) {
  const studentId = param(req, 'studentId')
  if (req.user!.role === 'STUDENT' && req.user!.id !== studentId) throw badRequest('Forbidden')
  const result = await aiService.learningFeedback(studentId)
  ok(res, result)
}

export async function listReviews(_req: Request, res: Response) {
  ok(res, [])
}

export async function reviewJob(_req: Request, _res: Response) {
  throw badRequest('AI review functionality not available in current schema')
}

export async function getConfig(_req: Request, res: Response) {
  const settings = await prisma.systemConfig.findMany()
  const map = Object.fromEntries(settings.map((s) => [s.Key, s.Value]))
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
      await prisma.systemConfig.upsert({
        where: { Key: key },
        create: { Key: key, Value: String(body[key]) },
        update: { Value: String(body[key]) },
      })
    }
  }
  ok(res, body)
}
