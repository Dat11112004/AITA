import { prisma, Prisma } from '../database/prisma.js'

export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  findMany: (where?: Prisma.UserWhereInput) => prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } }),
  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data }),
  update: (id: string, data: Prisma.UserUpdateInput) => prisma.user.update({ where: { id }, data }),
  delete: (id: string) => prisma.user.delete({ where: { id } }),
  count: () => prisma.user.count(),
}

