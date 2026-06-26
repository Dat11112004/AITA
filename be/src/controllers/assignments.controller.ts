import type { Request, Response } from 'express'
import { assignmentsService } from '../services/assignments.service.js'
import { createAssignmentSchema, updateAssignmentSchema } from '../validations/assignments.validation.js'
import { ok } from '../utils/response.js'
import { param } from '../utils/params.js'

export async function list(req: Request, res: Response) {
  const params = {
    classId: req.query.classId as string | undefined,
    status: req.query.status as string | undefined,
    type: req.query.type as string | undefined,
    tab: req.query.tab as string | undefined,
  }
  const result = await assignmentsService.list(req.user!, params)
  ok(res, result)
}

export async function create(req: Request, res: Response) {
  const payload = createAssignmentSchema.parse(req.body)
  const result = await assignmentsService.create(payload)
  ok(res, result, 201)
}

export async function update(req: Request, res: Response) {
  const payload = updateAssignmentSchema.parse(req.body)
  const id = param(req, 'id')
  const result = await assignmentsService.update(id, payload, req.user!)
  ok(res, result)
}

export async function getOne(req: Request, res: Response) {
  const result = await assignmentsService.getOne(param(req, 'id'))
  ok(res, result)
}
