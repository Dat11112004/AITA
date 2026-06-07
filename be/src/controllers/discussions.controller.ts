import type { Request, Response } from 'express'
import { discussionsService } from '../services/discussions.service.js'
import type { AuthUser } from '../types/express.js'

export const listThreads = async (req: Request, res: Response) => {
  const { classId } = req.query
  const data = await discussionsService.listThreads(classId as string)
  res.json({ success: true, data })
}

export const getThread = async (req: Request, res: Response) => {
  const { id } = req.params
  const data = await discussionsService.getThread(id as string)
  res.json({ success: true, data })
}

export const createThread = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser
  const data = await discussionsService.createThread(user, req.body)
  res.json({ success: true, data })
}

export const reply = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser
  const { threadId } = req.params
  const data = await discussionsService.reply(user, threadId as string, req.body)
  res.json({ success: true, data })
}
