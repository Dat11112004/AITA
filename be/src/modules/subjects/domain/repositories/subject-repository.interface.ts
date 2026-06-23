import type { Prisma, Subject } from '../../../../database/prisma.js'

export interface ISubjectRepository {
  findMany(where?: Prisma.SubjectWhereInput): Promise<Subject[]>
  findById(id: string): Promise<Subject | null>
  create(data: Prisma.SubjectUncheckedCreateInput): Promise<Subject>
  update(id: string, data: Prisma.SubjectUpdateInput): Promise<Subject>
  delete(id: string): Promise<Subject>
}
