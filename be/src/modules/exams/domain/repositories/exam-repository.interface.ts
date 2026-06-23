import type { Prisma, Exam } from '../../../../database/prisma.js'

export interface IExamRepository {
  findMany(where?: Prisma.ExamWhereInput): Promise<Exam[]>
  findById(id: string): Promise<Exam | null>
  create(data: Prisma.ExamUncheckedCreateInput): Promise<Exam>
  update(id: string, data: Prisma.ExamUpdateInput): Promise<Exam>
}
