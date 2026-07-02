
import { Semester } from '../../domain/entities/semester.entity.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'

export class SemesterRepository implements ISemesterRepository {
  constructor(private readonly prisma: any) {}

  async findById(id: string): Promise<Semester | null> {
    const raw = await this.prisma.semester.findUnique({ where: { Id: id } })
    return raw ? Semester.fromPersistence(raw) : null
  }

  async findByCode(code: string): Promise<Semester | null> {
    const raw = await this.prisma.semester.findFirst({ where: { Code: code } })
    return raw ? Semester.fromPersistence(raw) : null
  }

  async findAll(activeOnly?: boolean): Promise<Semester[]> {
    const where = activeOnly ? { IsActive: true } : {}
    const raw = await this.prisma.semester.findMany({ 
      where,
      orderBy: { StartDate: 'desc' }
    })
    return raw.map(Semester.fromPersistence)
  }

  async create(semester: Semester): Promise<void> {
    await this.prisma.semester.create({
      data: {
        Id: semester.id,
        Code: semester.code,
        IsActive: semester.isActive,
        StartDate: semester.startDate,
        EndDate: semester.endDate
      }
    })
  }

  async update(semester: Semester): Promise<void> {
    await this.prisma.semester.update({
      where: { Id: semester.id },
      data: {
        Code: semester.code,
        IsActive: semester.isActive,
        StartDate: semester.startDate,
        EndDate: semester.endDate
      }
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.semester.delete({
      where: { Id: id }
    })
  }
}
