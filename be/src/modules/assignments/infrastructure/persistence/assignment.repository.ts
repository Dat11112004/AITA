import { prisma } from '../../../../database/prisma.js'
import { IAssignmentRepository } from '../../domain/repositories/assignment.repository.interface.js'
import { Assignment, AssignmentStatus, AssignmentType } from '../../domain/entities/assignment.entity.js'

export class AssignmentRepository implements IAssignmentRepository {
  async findById(id: string): Promise<Assignment | null> {
    const assignmentData = await prisma.assignment.findUnique({
      where: { id },
    })

    if (!assignmentData) return null

    return Assignment.restore(
      assignmentData.id,
      assignmentData.classId,
      assignmentData.title,
      assignmentData.type as AssignmentType,
      'DRAFT' as AssignmentStatus,
      assignmentData.maxScore,
      assignmentData.description || undefined,
      assignmentData.dueAt || undefined,
      assignmentData.content || undefined,
      assignmentData.createdAt,
      assignmentData.updatedAt
    )
  }

  async findByClassId(classId: string): Promise<Assignment[]> {
    const assignmentsData = await prisma.assignment.findMany({
      where: { classId },
    })

    return assignmentsData.map(a => Assignment.restore(
      a.id,
      a.classId,
      a.title,
      a.type as AssignmentType,
      'DRAFT' as AssignmentStatus,
      a.maxScore,
      a.description || undefined,
      a.dueAt || undefined,
      a.content || undefined,
      a.createdAt,
      a.updatedAt
    ))
  }

  async create(assignment: Assignment): Promise<Assignment> {
    const savedData = await prisma.assignment.create({
      data: {
        id: assignment.id,
        classId: assignment.classId,
        title: assignment.title,
        type: assignment.type as any,
        maxScore: assignment.maxScore,
        description: assignment.description,
        dueAt: assignment.dueAt,
        content: assignment.content,
      },
    })

    return Assignment.restore(
      savedData.id,
      savedData.classId,
      savedData.title,
      savedData.type as AssignmentType,
      'DRAFT' as AssignmentStatus,
      savedData.maxScore,
      savedData.description || undefined,
      savedData.dueAt || undefined,
      savedData.content || undefined,
      savedData.createdAt,
      savedData.updatedAt
    )
  }

  async update(assignment: Assignment): Promise<Assignment> {
    const updatedData = await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        title: assignment.title,
        description: assignment.description,
        content: assignment.content,
        dueAt: assignment.dueAt,
        updatedAt: new Date(),
      },
    })

    return Assignment.restore(
      updatedData.id,
      updatedData.classId,
      updatedData.title,
      updatedData.type as AssignmentType,
      'DRAFT' as AssignmentStatus,
      updatedData.maxScore,
      updatedData.description || undefined,
      updatedData.dueAt || undefined,
      updatedData.content || undefined,
      updatedData.createdAt,
      updatedData.updatedAt
    )
  }

  async delete(id: string): Promise<void> {
    await prisma.assignment.delete({
      where: { id },
    })
  }

  async listAll(limit: number = 100, offset: number = 0): Promise<Assignment[]> {
    const assignmentsData = await prisma.assignment.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    })

    return assignmentsData.map(a => Assignment.restore(
      a.id,
      a.classId,
      a.title,
      a.type as AssignmentType,
      'DRAFT' as AssignmentStatus,
      a.maxScore,
      a.description || undefined,
      a.dueAt || undefined,
      a.content || undefined,
      a.createdAt,
      a.updatedAt
    ))
  }
}
