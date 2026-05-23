import type { AssignmentType, AssignmentStatus } from '@prisma/client'
import type { AuthUser } from '../types/express.js'
import { assignmentRepository } from '../repositories/assignment.repository.js'
import { classRepository, enrollmentRepository } from '../repositories/class.repository.js'
import { prisma } from '../database/prisma.js'
import { forbidden, notFound } from '../utils/errors.js'
import { mapAssignment } from '../utils/mappers.js'
import type { createAssignmentSchema, updateAssignmentSchema } from '../validations/assignments.validation.js'
import type { z } from 'zod'

const typeMap: Record<string, AssignmentType> = {
  quiz: 'QUIZ',
  coding: 'CODING',
  group: 'GROUP',
  QUIZ: 'QUIZ',
  CODING: 'CODING',
  GROUP: 'GROUP',
}

export const assignmentsService = {
  async list(user: AuthUser, params: { classId?: string; status?: string; type?: string; tab?: string }) {
    const { classId, status, type, tab } = params
    const where: Record<string, unknown> = {}
    if (classId) where.classId = classId
    if (type && type !== 'all') where.type = typeMap[type] ?? type
    if (status) where.status = String(status).toUpperCase()

    if (tab === 'active' || tab === 'overdue') where.status = 'PUBLISHED'

    let list = await assignmentRepository.findMany(where as any)

    if (user.role === 'LECTURER') {
      const myClassIds = (await classRepository.findMany({ lecturerId: user.id })).map((c) => c.id)
      list = list.filter((a) => myClassIds.includes(a.classId))
    }

    if (user.role === 'STUDENT') {
      const enrolled = await enrollmentRepository.findMany({ studentId: user.id })
      const ids = new Set(enrolled.map((e) => e.classId))
      list = list.filter((a) => ids.has(a.classId) && a.status === 'PUBLISHED')

      if (tab === 'submitted' || tab === 'graded') {
        const subs = await prisma.submission.findMany({ where: { studentId: user.id } })
        const subMap = new Map(subs.map((s) => [s.assignmentId, s]))
        list = list.filter((a) => {
          const sub = subMap.get(a.id)
          if (tab === 'submitted') return sub && sub.status === 'SUBMITTED'
          if (tab === 'graded') return sub && (sub.status === 'AI_GRADED' || sub.status === 'PUBLISHED')
          return true
        })
      }
      if (tab === 'overdue') {
        list = list.filter((a) => a.dueAt && a.dueAt < new Date())
      }
    }

    return list.map(mapAssignment)
  },

  async create(payload: z.infer<typeof createAssignmentSchema>) {
    const assignment = await assignmentRepository.create({
      classId: payload.classId,
      title: payload.title,
      description: payload.description,
      type: typeMap[payload.type.toLowerCase()] ?? (payload.type as AssignmentType),
      dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
      maxScore: payload.maxScore ?? 10,
      content: payload.content ? JSON.stringify(payload.content) : null,
      status: (payload.status?.toUpperCase() as AssignmentStatus) ?? 'DRAFT',
    })
    return mapAssignment(assignment)
  },

  async update(id: string, payload: z.infer<typeof updateAssignmentSchema>, user: AuthUser) {
    const a = await assignmentRepository.findById(id)
    if (!a) throw notFound()
    if (user.role === 'LECTURER' && a.class.lecturerId !== user.id) throw forbidden()
    
    const updated = await assignmentRepository.update(id, {
      title: payload.title,
      description: payload.description,
      status: payload.status ? (String(payload.status).toUpperCase() as AssignmentStatus) : undefined,
      dueAt: payload.dueAt ? new Date(String(payload.dueAt)) : undefined,
      content: payload.content !== undefined ? JSON.stringify(payload.content) : undefined,
    })
    return mapAssignment(updated)
  },

  async getOne(id: string) {
    const a = await assignmentRepository.findById(id)
    if (!a) throw notFound()
    return mapAssignment(a)
  }
}
