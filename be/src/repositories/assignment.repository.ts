import { prisma, Prisma } from '../database/prisma.js'

export const assignmentRepository = {
  findMany: (where?: Prisma.ExamWhereInput) =>
    prisma.exam.findMany({
      where,
      include: {
        Subject: true,
        AssignmentTemplate: true,
        _count: { select: { Submission: true } },
      },
      orderBy: { Id: 'desc' },
    }),
  findById: (id: string) =>
    prisma.exam.findUnique({
      where: { Id: id },
      include: {
        Subject: true,
        AssignmentTemplate: true,
        _count: { select: { Submission: true } },
      },
    }),
  create: (data: Prisma.ExamUncheckedCreateInput) =>
    prisma.exam.create({
      data,
      include: {
        Subject: true,
        AssignmentTemplate: true,
        _count: { select: { Submission: true } },
      },
    }),
  update: (id: string, data: Prisma.ExamUpdateInput) =>
    prisma.exam.update({
      where: { Id: id },
      data,
      include: {
        Subject: true,
        AssignmentTemplate: true,
        _count: { select: { Submission: true } },
      },
    }),
  count: (where?: Prisma.ExamWhereInput) => prisma.exam.count({ where }),
}
