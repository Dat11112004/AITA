// @ts-nocheck
import type { AuthUser } from '../types/express.js'
import { classRepository, enrollmentRepository } from '../repositories/class.repository.js'
import { badRequest, notFound } from '../utils/errors.js'
import { mapClass } from '../utils/mappers.js'
import type { createClassSchema, enrollSchema } from '../validations/classes.validation.js'
import type { z } from 'zod'

export const classesService = {
  async list(user: AuthUser) {
    let where: any = {}
    if (user.role === 'LECTURER') {
      where.InstructorClass = { some: { UserId: user.id } }
    }
    if (user.role === 'STUDENT') {
      where.StudentClass = { some: { UserId: user.id } }
    }

    const classes = await classRepository.findMany(where)
    return classes.map(mapClass)
  },

  async create(payload: z.infer<typeof createClassSchema>) {
    if (await classRepository.findByCode(payload.code)) {
      throw badRequest('Mã lớp đã tồn tại')
    }

    const cls = await classRepository.create({
      ClassCode: payload.code,
      SubjectId: payload.subject,
      SemesterId: payload.semester,
      Status: 'Active',
    })

    // Assign instructor
    if (payload.lecturerId) {
      const prisma = (await import('../database/prisma.js')).prisma
      await prisma.instructorClass.create({
        data: { UserId: payload.lecturerId, ClassId: cls.Id },
      })
    }

    return mapClass(cls)
  },

  async getStudents(classId: string, _user: AuthUser) {
    const cls = await classRepository.findById(classId)
    if (!cls) throw notFound('Lớp không tồn tại')

    const enrollments = await enrollmentRepository.findMany({ ClassId: classId })
    return enrollments.map((e: any) => ({
      id: e.User?.Id,
      studentId: e.User?.StudentCode ?? e.User?.Id,
      name: e.User?.FullName,
      email: e.User?.Email,
      progress: '—',
      grade: '—',
    }))
  },

  async enroll(classId: string, payload: z.infer<typeof enrollSchema>) {
    const enrollment = await enrollmentRepository.create({
      ClassId: classId,
      UserId: payload.studentId,
    })
    return enrollment
  },
}
