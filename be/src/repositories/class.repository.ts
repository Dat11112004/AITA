import { prisma, Prisma } from '../database/prisma.js'

export const classRepository = {
  findMany: (where?: Prisma.ClassWhereInput) =>
    prisma.class.findMany({
      where,
      include: {
        Subject: true,
        Semester: true,
        InstructorClass: { include: { User: true } },
        _count: { select: { StudentClass: true } },
      },
      orderBy: { Id: 'desc' },
    }),
  findById: (id: string) =>
    prisma.class.findUnique({
      where: { Id: id },
      include: { Subject: true, Semester: true, InstructorClass: { include: { User: true } } },
    }),
  findByCode: (code: string) =>
    prisma.class.findUnique({
      where: { ClassCode: code },
      include: { Subject: true, Semester: true, InstructorClass: { include: { User: true } } },
    }),
  create: (data: Prisma.ClassUncheckedCreateInput) =>
    prisma.class.create({
      data,
      include: { Subject: true, Semester: true, InstructorClass: { include: { User: true } } },
    }),
  count: () => prisma.class.count(),
}

export const enrollmentRepository = {
  create: (data: Prisma.StudentClassUncheckedCreateInput) => prisma.studentClass.create({ data }),
  findMany: (where?: Prisma.StudentClassWhereInput) =>
    prisma.studentClass.findMany({
      where,
      include: { User: true },
    }),
  count: (where?: Prisma.StudentClassWhereInput) => prisma.studentClass.count({ where }),
}
