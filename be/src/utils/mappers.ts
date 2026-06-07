import type { User, Class, Assignment, Submission, AIJob, ActivityLog, Subject, Content, Notification, DiscussionThread, DiscussionReply } from '@prisma/client'

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

export function mapSubject(s: Subject) {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    difficulty: s.difficulty,
    description: s.description,
    codeExamples: s.codeExamples,
    curriculum: s.curriculum,
    createdAt: s.createdAt.toISOString(),
  }
}

export function mapContent(c: Content & { author?: { fullName: string } }) {
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    body: c.body,
    status: c.status,
    author: c.author?.fullName ?? 'Hệ thống',
    publishAt: c.publishAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export function mapNotification(n: Notification) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    target: n.target,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }
}

export function mapDiscussionThread(t: DiscussionThread & { author?: { fullName: string; role: string }; class?: { name: string }; _count?: { replies: number }; replies?: any[] }) {
  return {
    id: t.id,
    classId: t.classId,
    className: t.class?.name,
    title: t.title,
    content: t.content,
    author: t.author?.fullName ?? 'Hệ thống',
    authorRole: t.author?.role.toLowerCase() ?? 'system',
    resolved: t.resolved,
    createdAt: t.createdAt.toISOString(),
    replyCount: t._count?.replies ?? 0,
    replies: t.replies?.map(mapDiscussionReply) ?? [],
  }
}

export function mapDiscussionReply(r: DiscussionReply & { author?: { fullName: string; role: string } }) {
  return {
    id: r.id,
    content: r.content,
    author: r.author?.fullName ?? 'Hệ thống',
    authorRole: r.author?.role.toLowerCase() ?? 'system',
    createdAt: r.createdAt.toISOString(),
  }
}

function tryParseJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}
