
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
    await this.prisma.$transaction(async (tx: any) => {
      // Find all classes in this semester
      const classes = await tx.class.findMany({ where: { SemesterId: id }, select: { Id: true } })
      const classIds = classes.map((c: any) => c.Id)
      
      if (classIds.length > 0) {
        // Manually cascade delete relations for each class (due to potential DB-level missing cascade)
        await tx.studentClass.deleteMany({ where: { ClassId: { in: classIds } } })
        await tx.instructorClass.deleteMany({ where: { ClassId: { in: classIds } } })
        await tx.examClass.deleteMany({ where: { ClassId: { in: classIds } } })
        
        // Delete submissions and their related records
        const submissions = await tx.submission.findMany({ where: { ClassId: { in: classIds } }, select: { Id: true } })
        const submissionIds = submissions.map((s: any) => s.Id)
        if (submissionIds.length > 0) {
          await tx.submissionArtifact.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.executionResult.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.aiUsageLog.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.gradingSession.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.submission.deleteMany({ where: { Id: { in: submissionIds } } })
        }

        // Delete the classes
        await tx.class.deleteMany({ where: { SemesterId: id } })
      }
      
      // Delete the semester itself
      await tx.semester.delete({
        where: { Id: id }
      })
    })
  }
}
