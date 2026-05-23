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
  const rows = await prisma.systemSetting.findMany()
  const settings = { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) }
  ok(res, settings)
}

export async function update(req: Request, res: Response) {
  const body = req.body as Record<string, string>
  for (const [key, value] of Object.entries(body)) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    })
  }
  ok(res, body)
}
