import type { Request, Response } from 'express'
import { usersService } from '../services/users.service.js'
import { createUserSchema, updateUserSchema } from '../validations/users.validation.js'
import { ok } from '../utils/response.js'
import { param } from '../utils/params.js'

export class UsersController {
  async list(req: Request, res: Response) {
    const roleParam = String(req.query.role ?? 'all')
    const users = await usersService.list(roleParam)
    ok(res, users)
  }

  async create(req: Request, res: Response) {
    const payload = createUserSchema.parse(req.body)
    const result = await usersService.create(payload, req.user!.id)
    ok(res, result, 201)
  }

  async update(req: Request, res: Response) {
    const payload = updateUserSchema.parse(req.body)
    const id = param(req, 'id')
    const result = await usersService.update(id, payload)
    ok(res, result)
  }

  async delete(req: Request, res: Response) {
    const id = param(req, 'id')
    await usersService.delete(id)
    ok(res, { success: true })
  }

  async toggleLock(req: Request, res: Response) {
    const id = param(req, 'id')
    const { locked } = req.body
    const result = await usersService.toggleLock(id, locked)
    ok(res, result)
  }
}
