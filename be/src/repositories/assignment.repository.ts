import { prisma, Prisma } from '../database/prisma.js'

export const assignmentRepository = {
  findMany: (where?: Prisma.AssignmentWhereInput) => prisma.assignment.findMany({
    where,
    include: { class: true, _count: { select: { submissions: true } } },
    orderBy: { createdAt: 'desc' },
  }),
  findById: (id: string) => prisma.assignment.findUnique({ 
    where: { id },
    include: { class: true, _count: { select: { submissions: true } } }, 
  }),
  create: (data: Prisma.AssignmentUncheckedCreateInput) => prisma.assignment.create({ 
    data,
    include: { class: true, _count: { select: { submissions: true } } },
  }),
  update: (id: string, data: Prisma.AssignmentUpdateInput) => prisma.assignment.update({ 
    where: { id }, 
    data,
    include: { class: true, _count: { select: { submissions: true } } },
  }),
  count: (where?: Prisma.AssignmentWhereInput) => prisma.assignment.count({ where }),
}
