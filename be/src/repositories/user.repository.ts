import { prisma } from '../database/prisma.js'
import type { Prisma } from '@prisma/client'

export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  findMany: (where?: Prisma.UserWhereInput) => prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } }),
  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data }),
  update: (id: string, data: Prisma.UserUpdateInput) => prisma.user.update({ where: { id }, data }),
  count: () => prisma.user.count(),
}
