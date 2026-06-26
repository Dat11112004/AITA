import type { Request, Response } from 'express'
import { prisma } from '../database/prisma.js'
import { ok } from '../utils/response.js'

const DEFAULTS: Record<string, string> = {
  appName: 'AITA',
  organization: 'FPT University',
  sessionTimeout: '60',
  aiEndpoint: '',
  aiModel: 'stub',
  aiTimeout: '60',
  aiStubMode: 'true',
}

export async function getAll(_req: Request, res: Response) {
  const rows = await prisma.systemConfig.findMany()
  const settings = { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.Key, r.Value])) }
  ok(res, settings)
}

export async function update(req: Request, res: Response) {
  const body = req.body as Record<string, string>
  for (const [key, value] of Object.entries(body)) {
    await prisma.systemConfig.upsert({
      where: { Key: key },
      create: { Key: key, Value: String(value) },
      update: { Value: String(value) },
    })
  }
  ok(res, body)
}
