import { prisma, Prisma } from '../database/prisma.js'

export const contentRepository = {
  findMany: (where?: Prisma.ContentWhereInput) => prisma.content.findMany({
    where,
    include: { author: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  }),
  findById: (id: string) => prisma.content.findUnique({ 
    where: { id },
    include: { author: { select: { fullName: true } } },
  }),
  create: (data: Prisma.ContentUncheckedCreateInput) => prisma.content.create({ data }),
  update: (id: string, data: Prisma.ContentUpdateInput) => prisma.content.update({ where: { id }, data }),
  delete: (id: string) => prisma.content.delete({ where: { id } }),
}
