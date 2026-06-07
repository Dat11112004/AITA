import type { SubmissionStatus } from '@prisma/client'
import type { AuthUser } from '../types/express.js'
import { submissionRepository } from '../repositories/submission.repository.js'
import { assignmentRepository } from '../repositories/assignment.repository.js'
import { classRepository } from '../repositories/class.repository.js'
import { activityRepository } from '../repositories/activity.repository.js'
import { badRequest, forbidden, notFound } from '../utils/errors.js'
import { mapSubmission } from '../utils/mappers.js'
import type { submitAssignmentSchema, publishGradeSchema } from '../validations/submissions.validation.js'
import type { z } from 'zod'

const statusTabMap: Record<string, SubmissionStatus> = {
  pending: 'SUBMITTED',
  'ai-done': 'AI_GRADED',
  published: 'PUBLISHED',
}

export const submissionsService = {
  async list(user: AuthUser, params: { assignmentId?: string; status?: string }) {
    const { assignmentId, status } = params
    const where: Record<string, unknown> = {}
    if (assignmentId) where.assignmentId = assignmentId
    if (status) where.status = statusTabMap[status] ?? (String(status).toUpperCase() as SubmissionStatus)
    if (user.role === 'STUDENT') where.studentId = user.id

    let submissions = await submissionRepository.findMany(where)
    if (user.role === 'LECTURER') {
      const myClassIds = (await classRepository.findMany({ lecturerId: user.id })).map((c: any) => c.id)
      submissions = submissions.filter((s: any) => myClassIds.includes(s.assignment.classId))
    }
    return submissions.map(mapSubmission)
  },

  async recent(user: AuthUser, limit: number) {
    const myClassIds = (await classRepository.findMany({ lecturerId: user.id })).map((c: any) => c.id)
    const submissions = await submissionRepository.findRecent({ assignment: { classId: { in: myClassIds } } }, limit)
    return submissions.map(mapSubmission)
  },

  async getOne(id: string, user: AuthUser) {
    const s = await submissionRepository.findById(id)
    if (!s) throw notFound()
    if (user.role === 'LECTURER' && s.assignment.class.lecturerId !== user.id) throw forbidden()
    return mapSubmission(s)
  },

  async submit(payload: z.infer<typeof submitAssignmentSchema>, user: AuthUser) {
    const assignment = await assignmentRepository.findById(payload.assignmentId)
    if (!assignment || assignment.status !== 'PUBLISHED') throw badRequest('Bài tập không khả dụng')

    const sub = await submissionRepository.upsert({
      where: {
        assignmentId_studentId: { assignmentId: payload.assignmentId, studentId: user.id },
      },
      create: {
        assignmentId: payload.assignmentId,
        studentId: user.id,
        content: payload.content ?? '',
        language: payload.language,
        groupCode: payload.groupCode,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      update: {
        content: payload.content ?? '',
        language: payload.language,
        groupCode: payload.groupCode,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: { student: true, assignment: true },
    })

    await activityRepository.create({
      userId: user.id,
      action: 'SUBMISSION_CREATE',
      entity: 'Submission',
      entityId: sub.id,
    })

    return mapSubmission(sub)
  },

  async publishGrade(id: string, payload: z.infer<typeof publishGradeSchema>, user: AuthUser) {
    const sub = await submissionRepository.findById(id)
    if (!sub) throw notFound()
    if (user.role === 'LECTURER' && sub.assignment.class.lecturerId !== user.id) throw forbidden()

    const updated = await submissionRepository.update(id, {
      score: payload.score ?? sub.aiScore ?? 0,
      status: 'PUBLISHED'
    })
    return mapSubmission(updated)
  }
}
