// @ts-nocheck
import type { Request, Response } from 'express'
import { notificationsService } from '../services/notifications.service.js'
import type { AuthUser } from '../types/express.js'

export const list = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser
  const data = await notificationsService.list(user)
  res.json({ success: true, data })
}

export const create = async (req: Request, res: Response) => {
  const data = await notificationsService.create(req.body)
  res.json({ success: true, data })
}

export const markRead = async (req: Request, res: Response) => {
  const { id } = req.params
  await notificationsService.markRead(id as string)
  res.json({ success: true, data: null })
}
