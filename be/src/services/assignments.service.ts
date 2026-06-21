import type { AuthUser } from '../types/express.js'
import { assignmentRepository } from '../repositories/assignment.repository.js'
import { classRepository, enrollmentRepository } from '../repositories/class.repository.js'
import { notFound } from '../utils/errors.js'
import type { createAssignmentSchema, updateAssignmentSchema } from '../validations/assignments.validation.js'
import type { z } from 'zod'

export const assignmentsService = {
  async list(user: AuthUser, params: { classId?: string; status?: string; type?: string; tab?: string }) {
    const { classId, status, type } = params
    const where: Record<string, unknown> = {}
    if (classId) where.SubjectId = classId
    if (type) where.ExamType = String(type).toUpperCase()
    if (status) where.Status = String(status).toUpperCase()

    let list = await assignmentRepository.findMany(where as any)

    if (user.role === 'LECTURER') {
      const myClassIds = (await classRepository.findMany({ InstructorClass: { some: { UserId: user.id } } })).map((c: any) => c.Id)
      list = list.filter((a: any) => myClassIds.includes(a.SubjectId))
    }

    if (user.role === 'STUDENT') {
      const enrolled = await enrollmentRepository.findMany({ UserId: user.id })
      const ids = new Set(enrolled.map((e: any) => e.ClassId))
      list = list.filter((a: any) => ids.has(a.SubjectId) && a.Status === 'Published')
    }

    return list.map((a: any) => ({
      id: a.Id,
      title: a.Title,
      description: a.Description,
      type: a.ExamType?.toLowerCase(),
      status: a.Status?.toLowerCase(),
      subjectId: a.SubjectId,
      maxScore: a.TotalPoints,
      dueAt: a.Duration,
      createdAt: a.Id,
    }))
  },

  async create(payload: z.infer<typeof createAssignmentSchema>) {
    const assignment = await assignmentRepository.create({
      Title: payload.title,
      Description: payload.description,
      SubjectId: payload.classId,
      ExamType: (payload.type?.toUpperCase() as any) ?? 'Assignment',
      Status: 'Draft',
      TotalPoints: payload.maxScore ?? 10,
      Duration: payload.dueAt ? Math.floor((new Date(payload.dueAt).getTime() - Date.now()) / 60000) : undefined,
    })

    return {
      id: assignment.Id,
      title: assignment.Title,
      description: assignment.Description,
      type: assignment.ExamType?.toLowerCase(),
      status: assignment.Status?.toLowerCase(),
    }
  },

  async update(id: string, payload: z.infer<typeof updateAssignmentSchema>, _user: AuthUser) {
    const a = await assignmentRepository.findById(id)
    if (!a) throw notFound()

    const updated = await assignmentRepository.update(id, {
      Title: payload.title,
      Description: payload.description,
      Status: payload.status ? String(payload.status).toUpperCase() as any : undefined,
    })

    return {
      id: updated.Id,
      title: updated.Title,
      description: updated.Description,
      type: updated.ExamType?.toLowerCase(),
      status: updated.Status?.toLowerCase(),
    }
  },

  async getOne(id: string) {
    const a = await assignmentRepository.findById(id)
    if (!a) throw notFound()
    return {
      id: a.Id,
      title: a.Title,
      description: a.Description,
      type: a.ExamType?.toLowerCase(),
      status: a.Status?.toLowerCase(),
      subjectId: a.SubjectId,
      maxScore: a.TotalPoints,
    }
  },
}
