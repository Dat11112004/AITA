import { prisma, Prisma } from '../database/prisma.js'

export const submissionRepository = {
  findMany: (where?: Prisma.SubmissionWhereInput) =>
    prisma.submission.findMany({
      where,
      include: {
        User_Submission_StudentIdToUser: true,
        Exam: true,
        Class: true,
      },
      orderBy: { SubmittedAt: 'desc' },
    }),
  findRecent: (where?: Prisma.SubmissionWhereInput, take: number = 5) =>
    prisma.submission.findMany({
      where,
      include: {
        User_Submission_StudentIdToUser: true,
        Exam: true,
      },
      orderBy: { SubmittedAt: 'desc' },
      take,
    }),
  findById: (id: string) =>
    prisma.submission.findUnique({
      where: { Id: id },
      include: {
        User_Submission_StudentIdToUser: true,
        Exam: true,
        Class: true,
      },
    }),
  upsert: (args: Prisma.SubmissionUpsertArgs) => prisma.submission.upsert(args),
  update: (id: string, data: Prisma.SubmissionUpdateInput) =>
    prisma.submission.update({
      where: { Id: id },
      data,
      include: {
        User_Submission_StudentIdToUser: true,
        Exam: true,
      },
    }),
}
