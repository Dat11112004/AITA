// @ts-nocheck
import type { Request, Response } from 'express'
import { subjectsService } from '../services/subjects.service.js'

export const list = async (_req: Request, res: Response) => {
  const data = await subjectsService.list()
  res.json({ success: true, data })
}

export const create = async (req: Request, res: Response) => {
  const data = await subjectsService.create(req.body)
  res.json({ success: true, data })
}

export const update = async (req: Request, res: Response) => {
  const { id } = req.params
  const data = await subjectsService.update(id as string, req.body)
  res.json({ success: true, data })
}

export const remove = async (req: Request, res: Response) => {
  const { id } = req.params
  await subjectsService.delete(id as string)
  res.json({ success: true, data: null })
}
