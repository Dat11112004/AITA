import { prisma, Prisma } from '../database/prisma.js'

export const subjectRepository = {
  findMany: (where?: Prisma.SubjectWhereInput) => prisma.subject.findMany({
    where,
    orderBy: { code: 'asc' },
  }),
  findById: (id: string) => prisma.subject.findUnique({ where: { id } }),
  findByCode: (code: string) => prisma.subject.findUnique({ where: { code } }),
  create: (data: Prisma.SubjectCreateInput) => prisma.subject.create({ data }),
  update: (id: string, data: Prisma.SubjectUpdateInput) => prisma.subject.update({ where: { id }, data }),
  delete: (id: string) => prisma.subject.delete({ where: { id } }),
}
