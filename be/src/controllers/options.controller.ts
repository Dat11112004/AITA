import type { Request, Response } from 'express'
import { prisma } from '../database/prisma.js'
import { ok } from '../utils/response.js'
import { mapUser } from '../utils/mappers.js'

export async function classOptions(req: Request, res: Response) {
  const user = req.user!
  let where = {}

  if (user.role === 'LECTURER') where = { lecturerId: user.id }
  if (user.role === 'STUDENT') {
    const enrolled = await prisma.classEnrollment.findMany({
      where: { studentId: user.id },
      select: { classId: true },
    })
    where = { id: { in: enrolled.map((e) => e.classId) } }
  }

  const classes = await prisma.class.findMany({
    where,
    orderBy: { code: 'asc' },
  })

  ok(
    res,
    classes.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
  )
}

export async function assignmentOptions(req: Request, res: Response) {
  const classId = req.query.classId as string | undefined
  const user = req.user!

  const where: Record<string, unknown> = {}
  if (classId) where.classId = classId

  if (user.role === 'LECTURER') {
    const myIds = (
      await prisma.class.findMany({ where: { lecturerId: user.id }, select: { id: true } })
    ).map((c) => c.id)
    where.classId = classId ? classId : { in: myIds }
  }

  if (user.role === 'STUDENT') {
    where.status = 'PUBLISHED'
    const enrolled = await prisma.classEnrollment.findMany({
      where: { studentId: user.id },
      select: { classId: true },
    })
    const ids = enrolled.map((e) => e.classId)
    where.classId = classId ? classId : { in: ids }
  }

  const list = await prisma.assignment.findMany({ where, orderBy: { title: 'asc' } })
  ok(res, list.map((a) => ({ value: a.id, label: a.title })))
}

export async function lecturerOptions(_req: Request, res: Response) {
  const lecturers = await prisma.user.findMany({
    where: { role: 'LECTURER', status: 'ACTIVE' },
    orderBy: { fullName: 'asc' },
  })
  ok(res, lecturers.map((u) => ({ value: u.id, label: mapUser(u).name })))
}
