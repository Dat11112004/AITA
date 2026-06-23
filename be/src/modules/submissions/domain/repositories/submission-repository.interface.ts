import type { Prisma, Submission } from '../../../../database/prisma.js'

export interface ISubmissionRepository {
  findMany(where?: Prisma.SubmissionWhereInput): Promise<Submission[]>
  findRecent(where?: Prisma.SubmissionWhereInput, take?: number): Promise<Submission[]>
  findById(id: string): Promise<Submission | null>
  create(data: Prisma.SubmissionUncheckedCreateInput): Promise<Submission>
  update(id: string, data: Prisma.SubmissionUpdateInput): Promise<Submission>
}
