import { ISubjectRepository, SubjectFilter } from '../../domain/repositories/subject-repository.interface.js'
import { Subject } from '../../domain/entities/subject.entity.js'
import { SubjectMapper } from '../mappers/subject.mapper.js'

export class PrismaSubjectRepository implements ISubjectRepository {
  constructor(private readonly client: any) {}

  private mapFilterToWhere(filter?: SubjectFilter): any {
    const where: any = {}
    if (filter?.isActive !== undefined) where.IsActive = filter.isActive
    if (filter?.search) {
      where.OR = [
        { SubjectCode: { contains: filter.search } },
        { SubjectName: { contains: filter.search } }
      ]
    }
    return where
  }

  async findMany(filter?: SubjectFilter): Promise<Subject[]> {
    const rawList = await this.client.subject.findMany({
      where: this.mapFilterToWhere(filter),
      orderBy: { SubjectCode: 'asc' }
    })
    return rawList.map(SubjectMapper.toDomain)
  }

  async findById(id: string): Promise<Subject | null> {
    const raw = await this.client.subject.findUnique({ where: { Id: id } })
    return raw ? SubjectMapper.toDomain(raw) : null
  }

  async findByCode(code: string): Promise<Subject | null> {
    const raw = await this.client.subject.findUnique({ where: { SubjectCode: code } })
    return raw ? SubjectMapper.toDomain(raw) : null
  }

  async create(subject: Subject): Promise<void> {
    const data = SubjectMapper.toPersistence(subject)
    await this.client.subject.create({ data })
  }

  async update(subject: Subject): Promise<void> {
    const data = SubjectMapper.toPersistence(subject)
    await this.client.subject.update({
      where: { Id: subject.id },
      data
    })
  }

  async delete(id: string): Promise<void> {
    await this.client.subject.delete({ where: { Id: id } })
  }

  async save(subject: Subject): Promise<void> {
    const existing = await this.client.subject.findUnique({ where: { Id: subject.id } })
    if (existing) {
      await this.update(subject)
    } else {
      await this.create(subject)
    }
  }
}
