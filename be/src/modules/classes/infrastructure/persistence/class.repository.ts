import { prisma } from '../../../../database/prisma.js'
import { IClassRepository } from '../../domain/repositories/class.repository.interface.js'
import { Class } from '../../domain/entities/class.entity.js'

export class ClassRepository implements IClassRepository {
  async findById(id: string): Promise<Class | null> {
    const classData = await prisma.class.findUnique({
      where: { id },
    })

    if (!classData) return null

    return Class.restore(
      classData.id,
      classData.code,
      classData.name,
      classData.subject,
      classData.semester,
      classData.lecturerId,
      classData.campus || undefined,
      classData.schedule || undefined,
      classData.createdAt,
      classData.updatedAt
    )
  }

  async findByCode(code: string): Promise<Class | null> {
    const classData = await prisma.class.findUnique({
      where: { code },
    })

    if (!classData) return null

    return Class.restore(
      classData.id,
      classData.code,
      classData.name,
      classData.subject,
      classData.semester,
      classData.lecturerId,
      classData.campus || undefined,
      classData.schedule || undefined,
      classData.createdAt,
      classData.updatedAt
    )
  }

  async findByLecturerId(lecturerId: string): Promise<Class[]> {
    const classesData = await prisma.class.findMany({
      where: { lecturerId },
    })

    return classesData.map(c => Class.restore(
      c.id,
      c.code,
      c.name,
      c.subject,
      c.semester,
      c.lecturerId,
      c.campus || undefined,
      c.schedule || undefined,
      c.createdAt,
      c.updatedAt
    ))
  }

  async create(classEntity: Class): Promise<Class> {
    const savedData = await prisma.class.create({
      data: {
        id: classEntity.id,
        code: classEntity.code,
        name: classEntity.name,
        subject: classEntity.subject,
        semester: classEntity.semester,
        lecturerId: classEntity.lecturerId,
        campus: classEntity.campus,
        schedule: classEntity.schedule,
      },
    })

    return Class.restore(
      savedData.id,
      savedData.code,
      savedData.name,
      savedData.subject,
      savedData.semester,
      savedData.lecturerId,
      savedData.campus || undefined,
      savedData.schedule || undefined,
      savedData.createdAt,
      savedData.updatedAt
    )
  }

  async update(classEntity: Class): Promise<Class> {
    const updatedData = await prisma.class.update({
      where: { id: classEntity.id },
      data: {
        name: classEntity.name,
        subject: classEntity.subject,
        semester: classEntity.semester,
        campus: classEntity.campus,
        schedule: classEntity.schedule,
        updatedAt: new Date(),
      },
    })

    return Class.restore(
      updatedData.id,
      updatedData.code,
      updatedData.name,
      updatedData.subject,
      updatedData.semester,
      updatedData.lecturerId,
      updatedData.campus || undefined,
      updatedData.schedule || undefined,
      updatedData.createdAt,
      updatedData.updatedAt
    )
  }

  async delete(id: string): Promise<void> {
    await prisma.class.delete({
      where: { id },
    })
  }

  async listAll(limit: number = 100, offset: number = 0): Promise<Class[]> {
    const classesData = await prisma.class.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    })

    return classesData.map(c => Class.restore(
      c.id,
      c.code,
      c.name,
      c.subject,
      c.semester,
      c.lecturerId,
      c.campus || undefined,
      c.schedule || undefined,
      c.createdAt,
      c.updatedAt
    ))
  }
}
