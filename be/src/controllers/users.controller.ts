import type { Request, Response } from 'express'
import { usersService } from '../services/users.service.js'
import { createUserSchema, updateUserSchema } from '../validations/users.validation.js'
import { ok } from '../utils/response.js'
import { param } from '../utils/params.js'

export async function list(req: Request, res: Response) {
  const roleParam = String(req.query.role ?? 'all')
  const users = await usersService.list(roleParam)
  ok(res, users)
}

export async function create(req: Request, res: Response) {
  const payload = createUserSchema.parse(req.body)
  const result = await usersService.create(payload, req.user!.id)
  ok(res, result, 201)
}

export async function update(req: Request, res: Response) {
  const payload = updateUserSchema.parse(req.body)
  const id = param(req, 'id')
  const result = await usersService.update(id, payload)
  ok(res, result)
}
