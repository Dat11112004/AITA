import { prisma } from '../database/prisma.js'
import type { Prisma } from '@prisma/client'

export const classRepository = {
  findMany: (where?: Prisma.ClassWhereInput) => prisma.class.findMany({
    where,
    include: {
      lecturer: true,
      _count: { select: { enrollments: true, assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  }),
  findById: (id: string) => prisma.class.findUnique({ where: { id } }),
  findByCode: (code: string) => prisma.class.findUnique({ where: { code } }),
  create: (data: Prisma.ClassCreateInput) => prisma.class.create({ 
    data,
    include: { lecturer: true, _count: { select: { enrollments: true, assignments: true } } },
  }),
  count: () => prisma.class.count(),
}

export const enrollmentRepository = {
  create: (data: Prisma.ClassEnrollmentUncheckedCreateInput) => prisma.classEnrollment.create({ data }),
  findMany: (where?: Prisma.ClassEnrollmentWhereInput) => prisma.classEnrollment.findMany({
    where,
    include: { student: true }
  }),
  count: (where?: Prisma.ClassEnrollmentWhereInput) => prisma.classEnrollment.count({ where }),
}
