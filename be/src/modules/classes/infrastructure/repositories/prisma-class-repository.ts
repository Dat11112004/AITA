import type { Prisma } from '../../../../database/prisma.js'
import { IClassRepository, ClassWithRelations } from '../../domain/repositories/class-repository.interface.js'

export class PrismaClassRepository implements IClassRepository {
  private client: any

  constructor(client: any) {
    this.client = client
  }

  private get include() {
    return {
      InstructorClass: { include: { User: true } },
      Subject: true,
      Semester: true,
    }
  }

  async findMany(where?: Prisma.ClassWhereInput): Promise<ClassWithRelations[]> {
    return this.client.class.findMany({ where, include: this.include })
  }

  async findById(id: string): Promise<ClassWithRelations | null> {
    return this.client.class.findUnique({ where: { Id: id }, include: this.include })
  }

  async findByCode(code: string): Promise<ClassWithRelations | null> {
    return this.client.class.findFirst({ where: { ClassCode: code }, include: this.include })
  }

  async create(data: Prisma.ClassUncheckedCreateInput): Promise<ClassWithRelations> {
    return this.client.class.create({ data, include: this.include })
  }

  async update(id: string, data: Prisma.ClassUpdateInput): Promise<ClassWithRelations> {
    return this.client.class.update({ where: { Id: id }, data, include: this.include })
  }

  async delete(id: string): Promise<ClassWithRelations> {
    return this.client.class.delete({ where: { Id: id }, include: this.include })
  }

  async assignInstructor(classId: string, instructorId: string): Promise<void> {
    await this.client.instructorClass.create({
      data: { ClassId: classId, UserId: instructorId },
    })
  }
}
