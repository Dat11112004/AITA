import { prisma, Prisma } from '../database/prisma.js'

export const userRepository = {
  findByEmail: (email: string) =>
    prisma.user.findUnique({
      where: { Email: email },
      include: { UserRole: { include: { Role: true } } },
    }),
  findById: (id: string) =>
    prisma.user.findUnique({
      where: { Id: id },
      include: { UserRole: { include: { Role: true } } },
    }),
  findMany: (where?: Prisma.UserWhereInput) =>
    prisma.user.findMany({
      where,
      include: { UserRole: { include: { Role: true } } },
      orderBy: { Id: 'desc' },
    }),
  create: (data: Prisma.UserUncheckedCreateInput) =>
    prisma.user.create({
      data,
      include: { UserRole: { include: { Role: true } } },
    }),
  update: (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({
      where: { Id: id },
      data,
      include: { UserRole: { include: { Role: true } } },
    }),
  delete: (id: string) => prisma.user.delete({ where: { Id: id } }),
  count: () => prisma.user.count(),
}
