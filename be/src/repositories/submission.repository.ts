import { prisma, Prisma } from '../database/prisma.js'

export const submissionRepository = {
  findMany: (where?: Prisma.SubmissionWhereInput) => prisma.submission.findMany({
    where,
    include: { student: true, assignment: { include: { class: true } } },
    orderBy: { submittedAt: 'desc' },
  }),
  findRecent: (where?: Prisma.SubmissionWhereInput, take: number = 5) => prisma.submission.findMany({
    where,
    include: { student: true, assignment: true },
    orderBy: { submittedAt: 'desc' },
    take,
  }),
  findById: (id: string) => prisma.submission.findUnique({
    where: { id },
    include: { student: true, assignment: { include: { class: true } } }
  }),
  upsert: (args: Prisma.SubmissionUpsertArgs) => prisma.submission.upsert(args),
  update: (id: string, data: Prisma.SubmissionUpdateInput) => prisma.submission.update({
    where: { id },
    data,
    include: { student: true, assignment: true },
  })
}
