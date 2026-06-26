// @ts-nocheck
import type { AuthUser } from '../types/express.js'
import { submissionRepository } from '../repositories/submission.repository.js'
import { assignmentRepository } from '../repositories/assignment.repository.js'
import { classRepository } from '../repositories/class.repository.js'
import { activityRepository } from '../repositories/activity.repository.js'
import { badRequest, notFound } from '../utils/errors.js'
import { mapSubmission } from '../utils/mappers.js'
import type { submitAssignmentSchema, publishGradeSchema } from '../validations/submissions.validation.js'
import type { z } from 'zod'
import { prisma } from '../database/prisma.js'

export const submissionsService = {
  async list(user: AuthUser, params: { assignmentId?: string; status?: string }) {
    const { assignmentId, status } = params
    const where: Record<string, unknown> = {}
    if (assignmentId) where.ExamId = assignmentId
    if (status) where.GradingStatus = String(status).toUpperCase()
    if (user.role === 'STUDENT') where.StudentId = user.id

    let submissions = await submissionRepository.findMany(where as any)
    if (user.role === 'LECTURER') {
      const myClassIds = (await classRepository.findMany({ InstructorClass: { some: { UserId: user.id } } })).map((c: any) => c.Id)
      submissions = submissions.filter((s: any) => myClassIds.includes(s.ClassId))
    }
    return submissions.map(mapSubmission)
  },

  async recent(user: AuthUser, limit: number) {
    const myClassIds = (await classRepository.findMany({ InstructorClass: { some: { UserId: user.id } } })).map((c: any) => c.Id)
    const submissions = await submissionRepository.findRecent({ ClassId: { in: myClassIds } }, limit)
    return submissions.map(mapSubmission)
  },

  async getOne(id: string, _user: AuthUser) {
    const s = await submissionRepository.findById(id)
    if (!s) throw notFound()
    return mapSubmission(s)
  },

  async submit(payload: z.infer<typeof submitAssignmentSchema>, user: AuthUser) {
    const assignment = await assignmentRepository.findById(payload.assignmentId)
    if (!assignment) throw badRequest('Bài tập không khả dụng')

    const sub = await prisma.submission.create({
      data: {
        ExamId: payload.assignmentId,
        StudentId: user.id,
        SubmittedAt: new Date(),
        GradingStatus: 'Pending',
      },
      include: {
        User_Submission_StudentIdToUser: true,
        Exam: true,
      },
    })

    await activityRepository.create({
      userId: user.id,
      action: 'SUBMISSION_CREATE',
      entity: 'Submission',
      entityId: sub.Id,
    })

    return mapSubmission(sub)
  },

  async publishGrade(id: string, payload: z.infer<typeof publishGradeSchema>, _user: AuthUser) {
    const sub = await submissionRepository.findById(id)
    if (!sub) throw notFound()

    const updated = await submissionRepository.update(id, {
      TotalScore: payload.score ?? sub.TotalScore ?? 0,
      GradingStatus: 'Graded',
    })
    return mapSubmission(updated)
  },
}
