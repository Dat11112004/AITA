import type { Request, Response } from 'express'
import { classesService } from '../services/classes.service.js'
import { createClassSchema, enrollSchema } from '../validations/classes.validation.js'
import { ok } from '../utils/response.js'
import { param } from '../utils/params.js'

export async function list(req: Request, res: Response) {
  const classes = await classesService.list(req.user!)
  ok(res, classes)
}

export async function create(req: Request, res: Response) {
  const payload = createClassSchema.parse(req.body)
  const cls = await classesService.create(payload)
  ok(res, cls, 201)
}

export async function getStudents(req: Request, res: Response) {
  const classId = param(req, 'id')
  const students = await classesService.getStudents(classId, req.user!)
  ok(res, students)
}

export async function enroll(req: Request, res: Response) {
  const payload = enrollSchema.parse(req.body)
  const classId = param(req, 'id')
  const enrollment = await classesService.enroll(classId, payload)
  ok(res, enrollment, 201)
}
