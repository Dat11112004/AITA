import type { User, Class, Assignment, Submission, AIJob, ActivityLog } from '@prisma/client'

export function mapUser(u: User) {
  return {
    id: u.id,
    name: u.fullName,
    fullName: u.fullName,
    email: u.email,
    role: u.role.toLowerCase(),
    status: u.status.toLowerCase(),
    externalId: u.externalId,
    createdAt: u.createdAt.toISOString(),
  }
}

export function mapClass(
  c: Class & {
    lecturer?: User
    _count?: { enrollments: number; assignments: number }
  },
) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    subject: c.subject,
    semester: c.semester,
    campus: c.campus,
    schedule: c.schedule,
    lecturerId: c.lecturerId,
    lecturer: c.lecturer ? mapUser(c.lecturer) : undefined,
    studentCount: c._count?.enrollments ?? 0,
    assignmentCount: c._count?.assignments ?? 0,
    count: c._count?.enrollments ?? 0,
  }
}

export function mapAssignment(
  a: Assignment & { class?: Class; _count?: { submissions: number } },
) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    type: a.type.toLowerCase(),
    status: a.status.toLowerCase(),
    classId: a.classId,
    class: a.class?.code ?? a.classId,
    due: a.dueAt?.toISOString() ?? null,
    dueAt: a.dueAt?.toISOString() ?? null,
    maxScore: a.maxScore,
    content: a.content ? tryParseJson(a.content) : null,
    submitted: a._count?.submissions ?? 0,
  }
}

export function mapSubmission(
  s: Submission & { student?: User; assignment?: Assignment & { class?: Class } },
) {
  return {
    id: s.id,
    assignmentId: s.assignmentId,
    studentId: s.studentId,
    student: s.student?.fullName ?? s.studentId,
    assignment: s.assignment?.title,
    status: s.status.toLowerCase(),
    content: s.content,
    language: s.language,
    groupCode: s.groupCode,
    score: s.score,
    aiScore: s.aiScore,
    aiFeedback: s.aiFeedback ? tryParseJson(s.aiFeedback) : null,
    submittedAt: s.submittedAt?.toISOString() ?? null,
    version: 1,
  }
}

export function mapAIReview(j: AIJob & { review?: { approved: boolean | null } | null; assignment?: Assignment | null }) {
  return {
    id: j.id,
    type: j.type,
    title: j.assignment?.title ?? j.type,
    class: j.assignment?.classId ?? '—',
    createdAt: j.createdAt.toISOString(),
    status:
      !j.review || j.review.approved === null
        ? 'pending'
        : j.review.approved
          ? 'approved'
          : 'rejected',
  }
}

export function mapActivity(log: ActivityLog & { user?: { fullName: string; email: string } | null }) {
  return {
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    user: log.user?.fullName ?? 'Hệ thống',
    email: log.user?.email,
    createdAt: log.createdAt.toISOString(),
  }
}

function tryParseJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}
