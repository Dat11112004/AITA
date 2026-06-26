import type { Request, Response } from 'express'
import { submissionsService } from '../services/submissions.service.js'
import { submitAssignmentSchema, publishGradeSchema } from '../validations/submissions.validation.js'
import { ok } from '../utils/response.js'
import { param } from '../utils/params.js'

export async function list(req: Request, res: Response) {
  const params = {
    assignmentId: req.query.assignmentId as string | undefined,
    status: req.query.status as string | undefined,
  }
  const result = await submissionsService.list(req.user!, params)
  ok(res, result)
}

export async function recent(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 5, 20)
  const result = await submissionsService.recent(req.user!, limit)
  ok(res, result)
}

export async function getOne(req: Request, res: Response) {
  const result = await submissionsService.getOne(param(req, 'id'), req.user!)
  ok(res, result)
}

export async function submit(req: Request, res: Response) {
  const payload = submitAssignmentSchema.parse(req.body)
  const result = await submissionsService.submit(payload, req.user!)
  ok(res, result, 201)
}

export async function publishGrade(req: Request, res: Response) {
  const payload = publishGradeSchema.parse(req.body)
  const result = await submissionsService.publishGrade(param(req, 'id'), payload, req.user!)
  ok(res, result)
}
