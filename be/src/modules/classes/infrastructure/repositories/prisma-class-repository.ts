import { IClassRepository, ClassFilter } from '../../domain/repositories/class-repository.interface.js'
import { Class } from '../../domain/entities/class.entity.js'
import { ClassMapper } from '../mappers/class.mapper.js'

export class PrismaClassRepository implements IClassRepository {
  constructor(private readonly client: any) {}

  private get include() {
    return {
      InstructorClass: { include: { User: true } },
      Subject: true,
      Semester: true,
      _count: { select: { StudentClass: true } }
    }
  }

  private mapFilterToWhere(filter?: ClassFilter): any {
    const where: any = {}
    if (filter?.semesterId) where.SemesterId = filter.semesterId
    if (filter?.subjectId) where.SubjectId = filter.subjectId
    if (filter?.instructorId) {
      where.InstructorClass = { some: { UserId: filter.instructorId } }
    }
    return where
  }

  async findMany(filter?: ClassFilter, options?: { skip?: number; take?: number }): Promise<Class[]> {
    const rawList = await this.client.class.findMany({
      where: this.mapFilterToWhere(filter),
      skip: options?.skip,
      take: options?.take,
      include: this.include,
      orderBy: { ClassCode: 'asc' }
    })
    return rawList.map(ClassMapper.toDomain)
  }

  async findById(id: string): Promise<Class | null> {
    const raw = await this.client.class.findUnique({
      where: { Id: id },
      include: this.include
    })
    return raw ? ClassMapper.toDomain(raw) : null
  }

  async findByCode(code: string): Promise<Class | null> {
    const raw = await this.client.class.findFirst({
      where: { ClassCode: code },
      include: this.include
    })
    return raw ? ClassMapper.toDomain(raw) : null
  }

  async create(classEntity: Class): Promise<void> {
    const data = ClassMapper.toPersistence(classEntity)
    await this.client.class.create({ data })
  }

  async update(classEntity: Class): Promise<void> {
    const data = ClassMapper.toPersistence(classEntity)
    await this.client.class.update({
      where: { Id: classEntity.id },
      data
    })
  }

  async delete(id: string): Promise<void> {
    await this.client.class.delete({ where: { Id: id } })
  }

  async assignInstructor(classId: string, instructorId: string): Promise<void> {
    await this.client.instructorClass.create({
      data: { ClassId: classId, UserId: instructorId },
    })
  }

  async save(classEntity: Class): Promise<void> {
    const existing = await this.client.class.findUnique({ where: { Id: classEntity.id } })
    if (existing) {
      await this.update(classEntity)
    } else {
      await this.create(classEntity)
    }
  }
}
