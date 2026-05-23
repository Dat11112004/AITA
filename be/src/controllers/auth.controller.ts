import type { Request, Response } from 'express'
import { authService } from '../services/auth.service.js'
import { loginSchema, registerStudentSchema } from '../validations/auth.validation.js'
import { ok } from '../utils/response.js'

export async function login(req: Request, res: Response) {
  const payload = loginSchema.parse(req.body)
  const result = await authService.login(payload)
  ok(res, result)
}

export async function registerStudent(req: Request, res: Response) {
  const payload = registerStudentSchema.parse(req.body)
  const result = await authService.registerStudent(payload)
  ok(res, result, 201)
}

export async function me(req: Request, res: Response) {
  const result = await authService.getMe(req.user!.id)
  ok(res, result)
}
