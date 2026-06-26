import type { Prisma } from '../../../../database/prisma.js'
import { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'

export class PrismaExamRepository implements IExamRepository {
  private client: any

  constructor(client: any) {
    this.client = client
  }

  private get include() {
    return {
      Subject: true,
      _count: { select: { Submission: true } }
    }
  }

  async findMany(params?: { where?: Prisma.ExamWhereInput, skip?: number, take?: number }): Promise<any[]> {
    return this.client.exam.findMany({ 
      where: params?.where,
      skip: params?.skip,
      take: params?.take,
      include: this.include
    })
  }

  async findById(id: string): Promise<any | null> {
    return this.client.exam.findUnique({ where: { Id: id }, include: this.include })
  }

  async create(data: Prisma.ExamUncheckedCreateInput): Promise<any> {
    return this.client.exam.create({ data, include: this.include })
  }

  async update(id: string, data: Prisma.ExamUpdateInput): Promise<any> {
    return this.client.exam.update({ where: { Id: id }, data, include: this.include })
  }
}
