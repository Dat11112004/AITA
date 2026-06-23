import type { Prisma, Exam } from '../../../../database/prisma.js'
import { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'

export class PrismaExamRepository implements IExamRepository {
  private client: any

  constructor(client: any) {
    this.client = client
  }

  async findMany(where?: Prisma.ExamWhereInput): Promise<Exam[]> {
    return this.client.exam.findMany({ where })
  }

  async findById(id: string): Promise<Exam | null> {
    return this.client.exam.findUnique({ where: { Id: id } })
  }

  async create(data: Prisma.ExamUncheckedCreateInput): Promise<Exam> {
    return this.client.exam.create({ data })
  }

  async update(id: string, data: Prisma.ExamUpdateInput): Promise<Exam> {
    return this.client.exam.update({ where: { Id: id }, data })
  }
}
