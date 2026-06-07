import type { AuthUser } from '../types/express.js'
import { classRepository, enrollmentRepository } from '../repositories/class.repository.js'
import { badRequest, forbidden, notFound } from '../utils/errors.js'
import { mapClass } from '../utils/mappers.js'
import type { createClassSchema, enrollSchema } from '../validations/classes.validation.js'
import type { z } from 'zod'

export const classesService = {
  async list(user: AuthUser) {
    let where = {}
    if (user.role === 'LECTURER') where = { lecturerId: user.id }
    if (user.role === 'STUDENT') {
      const enrolled = await enrollmentRepository.findMany({ studentId: user.id })
      where = { id: { in: enrolled.map((e: any) => e.classId) } }
    }

    const classes = await classRepository.findMany(where)
    return classes.map(mapClass)
  },

  async create(payload: z.infer<typeof createClassSchema>) {
    if (await classRepository.findByCode(payload.code)) {
      throw badRequest('Mã lớp đã tồn tại')
    }

    const cls = await classRepository.create({
      code: payload.code,
      name: payload.name,
      subject: payload.subject ?? payload.name,
      semester: payload.semester ?? '',
      campus: payload.campus,
      schedule: payload.schedule,
      lecturer: { connect: { id: payload.lecturerId } },
    })

    return mapClass(cls)
  },

  async getStudents(classId: string, user: AuthUser) {
    const cls = await classRepository.findById(classId)
    if (!cls) throw notFound('Lớp không tồn tại')
    if (user.role === 'LECTURER' && cls.lecturerId !== user.id) throw forbidden()

    const enrollments = await enrollmentRepository.findMany({ classId })
    return enrollments.map((e: any) => ({
      id: e.student.id,
      studentId: e.student.externalId ?? e.student.id,
      name: e.student.fullName,
      email: e.student.email,
      progress: '—',
      grade: '—',
    }))
  },

  async enroll(classId: string, payload: z.infer<typeof enrollSchema>) {
    const enrollment = await enrollmentRepository.create({
      classId,
      studentId: payload.studentId,
    })
    return enrollment
  }
}
