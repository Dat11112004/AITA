import type { Prisma, Subject } from '../../../../database/prisma.js'
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface.js'

export class PrismaSubjectRepository implements ISubjectRepository {
  private client: any

  constructor(client: any) {
    this.client = client
  }

  async findMany(where?: Prisma.SubjectWhereInput): Promise<Subject[]> {
    return this.client.subject.findMany({ where })
  }

  async findById(id: string): Promise<Subject | null> {
    return this.client.subject.findUnique({ where: { Id: id } })
  }

  async create(data: Prisma.SubjectUncheckedCreateInput): Promise<Subject> {
    return this.client.subject.create({ data })
  }

  async update(id: string, data: Prisma.SubjectUpdateInput): Promise<Subject> {
    return this.client.subject.update({ where: { Id: id }, data })
  }

  async delete(id: string): Promise<Subject> {
    return this.client.subject.delete({ where: { Id: id } })
  }
}
