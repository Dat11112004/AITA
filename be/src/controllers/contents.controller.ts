import type { Request, Response } from 'express'
import { contentsService } from '../services/contents.service.js'
import type { AuthUser } from '../types/express.js'

export const list = async (req: Request, res: Response) => {
  const data = await contentsService.list(req.query as any)
  res.json({ success: true, data })
}

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser
  const data = await contentsService.create({ ...req.body, authorId: user.id })
  res.json({ success: true, data })
}

export const update = async (req: Request, res: Response) => {
  const { id } = req.params
  const data = await contentsService.update(id as string, req.body)
  res.json({ success: true, data })
}

export const remove = async (req: Request, res: Response) => {
  const { id } = req.params
  await contentsService.delete(id as string)
  res.json({ success: true, data: null })
}
