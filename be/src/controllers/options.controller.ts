import type { Request, Response } from 'express'
import { prisma } from '../database/prisma.js'
import { ok } from '../utils/response.js'

export async function classOptions(req: Request, res: Response) {
  const user = req.user!
  let where: any = {}

  if (user.role === 'LECTURER') {
    where.InstructorClass = { some: { UserId: user.id } }
  }
  if (user.role === 'STUDENT') {
    where.StudentClass = { some: { UserId: user.id } }
  }

  const classes = await prisma.class.findMany({
    where,
    include: { Subject: true },
    orderBy: { ClassCode: 'asc' },
  })

  ok(
    res,
    classes.map((c) => ({ value: c.Id, label: `${c.ClassCode} — ${c.Subject?.SubjectName ?? c.ClassCode}` })),
  )
}

export async function assignmentOptions(req: Request, res: Response) {
  const classId = req.query.classId as string | undefined
  const user = req.user!

  const where: Record<string, any> = {}
  if (classId) where.SubjectId = classId

  if (user.role === 'LECTURER') {
    const myClassIds = (
      await prisma.class.findMany({
        where: { InstructorClass: { some: { UserId: user.id } } },
        select: { Id: true },
      })
    ).map((c) => c.Id)
    where.SubjectId = classId ? classId : { in: myClassIds }
  }

  if (user.role === 'STUDENT') {
    where.Status = 'Published'
    const enrolled = await prisma.studentClass.findMany({
      where: { UserId: user.id },
      select: { ClassId: true },
    })
    const ids = enrolled.map((e) => e.ClassId)
    where.SubjectId = classId ? classId : { in: ids }
  }

  const list = await prisma.exam.findMany({ where, orderBy: { Title: 'asc' } })
  ok(res, list.map((a) => ({ value: a.Id, label: a.Title })))
}

export async function lecturerOptions(_req: Request, res: Response) {
  const lecturers = await prisma.user.findMany({
    where: {
      UserRole: { some: { Role: { RoleName: 'LECTURER' } } },
      Status: 'Active',
    },
    include: { UserRole: { include: { Role: true } } },
    orderBy: { FullName: 'asc' },
  })
  ok(res, lecturers.map((u) => ({ value: u.Id, label: u.FullName })))
}
