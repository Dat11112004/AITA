import type { Prisma } from '../../../../database/prisma.js'

export type ClassWithRelations = Prisma.ClassGetPayload<{
  include: {
    InstructorClass: { include: { User: true } }
    Subject: true
    Semester: true
  }
}>

export interface IClassRepository {
  findMany(params?: { where?: Prisma.ClassWhereInput, skip?: number, take?: number }): Promise<ClassWithRelations[]>
  findById(id: string): Promise<ClassWithRelations | null>
  findByCode(code: string): Promise<ClassWithRelations | null>
  create(data: Prisma.ClassUncheckedCreateInput): Promise<ClassWithRelations>
  update(id: string, data: Prisma.ClassUpdateInput): Promise<ClassWithRelations>
  delete(id: string): Promise<ClassWithRelations>
  assignInstructor(classId: string, instructorId: string): Promise<void>
}
