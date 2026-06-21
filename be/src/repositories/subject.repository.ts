import { prisma, Prisma } from '../database/prisma.js'

export const subjectRepository = {
  findMany: (where?: Prisma.SubjectWhereInput) =>
    prisma.subject.findMany({
      where,
      orderBy: { SubjectCode: 'asc' },
    }),
  findById: (id: string) => prisma.subject.findUnique({ where: { Id: id } }),
  findByCode: (code: string) => prisma.subject.findUnique({ where: { SubjectCode: code } }),
  create: (data: Prisma.SubjectUncheckedCreateInput) => prisma.subject.create({ data }),
  update: (id: string, data: Prisma.SubjectUpdateInput) =>
    prisma.subject.update({ where: { Id: id }, data }),
  delete: (id: string) => prisma.subject.delete({ where: { Id: id } }),
}
