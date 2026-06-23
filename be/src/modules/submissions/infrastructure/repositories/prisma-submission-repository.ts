import type { Prisma, Submission } from '../../../../database/prisma.js'
import { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'

const includeDefault = {
  User_Submission_StudentIdToUser: true,
  Exam: true,
  Class: true,
}

export class PrismaSubmissionRepository implements ISubmissionRepository {
  constructor(private readonly client: any) {}

  async findMany(where?: Prisma.SubmissionWhereInput): Promise<Submission[]> {
    return this.client.submission.findMany({
      where,
      include: includeDefault,
      orderBy: { SubmittedAt: 'desc' },
    })
  }

  async findRecent(where?: Prisma.SubmissionWhereInput, take = 5): Promise<Submission[]> {
    return this.client.submission.findMany({
      where,
      include: includeDefault,
      orderBy: { SubmittedAt: 'desc' },
      take,
    })
  }

  async findById(id: string): Promise<Submission | null> {
    return this.client.submission.findUnique({
      where: { Id: id },
      include: includeDefault,
    })
  }

  async create(data: Prisma.SubmissionUncheckedCreateInput): Promise<Submission> {
    return this.client.submission.create({ data, include: includeDefault })
  }

  async update(id: string, data: Prisma.SubmissionUpdateInput): Promise<Submission> {
    return this.client.submission.update({
      where: { Id: id },
      data,
      include: includeDefault,
    })
  }
}
