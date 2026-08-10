import { secureStore } from './secureStore'

// Mirrors FE/src/lib/api.ts: same envelope unwrap (Data/data), same ApiError, Vietnamese fallback message.
// Differences: BASE from EXPO_PUBLIC_API_URL, Bearer token from secure-store, and refresh-token rotation
// against the BE V2 endpoint POST /auth/refresh-token (which returns { token, refreshToken }).
//
// SCOPE: mobile is a companion app for STUDENT + LECTURER only (no ADMIN, no heavy authoring). The methods
// below cover the mobile management surface; admin/config/authoring endpoints are intentionally absent.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api'
/** Origin of the API, i.e. BASE without its `/api` suffix — where static uploads are served. */
const ORIGIN = BASE.replace(/\/api\/?$/, '')

/**
 * Turn a server-relative file path into something an <Image> can actually load.
 *
 * Uploads come back as `/uploads/avatars/<id>.png` (be auth.controller.ts). Handed straight to
 * an <Image>, the web build resolves that against the Metro origin (:8081) and 404s, and a
 * native build has no origin at all. Absolute URLs and local `file:`/`blob:` picks pass through.
 */
export function fileUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (/^(https?:|data:|blob:|file:)/i.test(path)) return path
  return `${ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message)
  }
}

async function tryRefresh(): Promise<boolean> {
  const rt = await secureStore.getRefresh()
  if (!rt) return false
  try {
    const res = await fetch(`${BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    })
    const json: any = await res.json().catch(() => ({}))
    const data = json?.Data ?? json?.data
    if (!res.ok || !data?.token) return false
    await secureStore.setToken(data.token)
    if (data.refreshToken) await secureStore.setRefresh(data.refreshToken)
    return true
  } catch {
    return false
  }
}

async function request<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  const token = await secureStore.getToken()
  // FormData sets its own multipart boundary — never force a JSON content-type on it.
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  // On 401, attempt a single refresh-token rotation, then retry once.
  if (res.status === 401 && allowRefresh && (await tryRefresh())) {
    return request<T>(path, options, false)
  }

  const json: any = await res.json().catch(() => ({}))
  if (!res.ok || json.success === false || json.statusCode >= 400) {
    const status = json.statusCode || res.status
    const raw = json.Message || json.error?.message || res.statusText || 'Lỗi API'
    // Never show raw server errors (stack traces, DB connection strings, file paths) to users.
    // 4xx messages are meant for users (validation, auth); 5xx get a friendly generic message.
    const message =
      status === 503
        ? 'Không thể kết nối máy chủ. Vui lòng thử lại sau.'
        : status >= 500
          ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
          : raw
    throw new ApiError(message, status, json.error?.code)
  }
  return (json.Data !== undefined ? json.Data : json.data) as T
}

const lowercaseRole = <T extends { role?: string } | null | undefined>(u: T): T => {
  if (u && (u as any).role) (u as any).role = String((u as any).role).toLowerCase()
  return u
}

const qs = (params?: Record<string, string | number | undefined>): string => {
  if (!params) return ''
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  return clean.length ? `?${new URLSearchParams(clean.map(([k, v]) => [k, String(v)])).toString()}` : ''
}

// ── Response normalisers ───────────────────────────────────────────────────
// These types were mirrored from the web FE, but this BE shapes two payloads differently:
// a submission carries the student/exam nested and calls its state `gradingStatus`, and the
// class roster returns `name`/`studentId`. Reading the FE's flat names yielded `undefined`,
// so screens silently rendered their em-dash fallback. Flatten once here, at the boundary,
// so no screen has to know about either shape.
const toSubmissionRow = (raw: any): SubmissionRow => ({
  ...raw,
  // SubmissionResponseDto nests the student as `{ id, name, email }` — reading `fullName`
  // (the web's flat name) always yielded undefined, so every row showed its fallback.
  studentName: raw?.studentName ?? raw?.student?.name ?? raw?.student?.fullName ?? undefined,
  studentCode: raw?.studentCode ?? raw?.student?.studentCode ?? null,
  className: raw?.className ?? raw?.class?.code ?? raw?.class?.name ?? undefined,
  assignmentTitle: raw?.assignmentTitle ?? raw?.exam?.title ?? undefined,
  status: raw?.status ?? raw?.gradingStatus ?? raw?.reviewStatus ?? '',
  score: pickScore(raw),
  aiScore: raw?.aiScore ?? raw?.rawScore ?? null,
})

/**
 * The grade to show for a submission.
 *
 * `finalScore` is the after-penalty figure, but rows imported or graded through the older
 * paths carry a literal 0 there while the real mark sits in `totalScore`. Chaining with `??`
 * kept that 0 (it is not nullish), so a 10-point paper read as 0 for the lecturer while the
 * student's own screens showed 10. Prefer a non-zero final score, then fall back.
 */
function pickScore(raw: any): number | null {
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))
  const direct = num(raw?.score)
  if (direct !== null && !Number.isNaN(direct)) return direct
  const final = num(raw?.finalScore)
  const total = num(raw?.totalScore)
  if (final !== null && final > 0) return final
  if (total !== null && !Number.isNaN(total)) return total
  return final
}

// `studentId` on this payload is the student CODE, not a uuid (be get-class-students.use-case.ts).
// The roster carries no status field, so it is left undefined rather than defaulted to "active" —
// the UI must not assert a state the API never reported.
const toStudentRow = (raw: any): StudentRow => ({
  ...raw,
  fullName: raw?.fullName ?? raw?.name ?? '',
  studentCode: raw?.studentCode ?? raw?.studentId ?? null,
})

/**
 * `subjectName` on ExamResponseDto is built as `` `${subjectCode || ''} - ${subjectName}` ``
 * (be/src/modules/exams/application/dtos/exam.dto.ts), so it is "PRJ301 - Java Web
 * Application Development" — or " - Java Web…" when the subject has no code. Pull out the
 * short label a student would actually use, preferring the code and falling back to the
 * name; return undefined rather than a stray dash when neither is usable.
 */
const subjectLabel = (raw: any): string | undefined => {
  const s = typeof raw?.subjectName === 'string' ? raw.subjectName.trim() : ''
  if (!s) return undefined
  const [head, ...rest] = s.split(' - ')
  const code = head.trim()
  if (code) return code
  const name = rest.join(' - ').trim()
  return name || undefined
}

/**
 * ExamResponseDto exposes NO `class` field — it has `classes`, an array of class *uuids*,
 * which is useless as a label. The cards were therefore rendering their "no class" fallback
 * on every single assignment. Derive the label from `subjectName` here, at the boundary, so
 * no screen has to know the exam payload's shape.
 */
const toAssignmentRow = (raw: any): AssignmentRow => ({
  ...raw,
  class: raw?.class ?? raw?.className ?? subjectLabel(raw),
  due: raw?.due ?? raw?.dueDate ?? null,
  subjectLabel: typeof raw?.subjectName === 'string' ? raw.subjectName.trim() : undefined,
})

// The list use-case reports `read` and `isRead` (same value, two names) and `createdAt`
// as an ISO string or null. Collapse to one boolean so screens never test both.
const toNotificationRow = (raw: any): NotificationRow => ({
  ...raw,
  read: Boolean(raw?.read ?? raw?.isRead ?? false),
  createdAt: raw?.createdAt ?? null,
})

/**
 * `/student-portal/classes/:id` nests everything one level down and names the roster's
 * display field `fullName` but the lecturers' `name`. Flatten both so a screen renders
 * people the same way regardless of which list they came from.
 */
const toClassDetail = (raw: any): ClassDetail => ({
  id: raw?.id ?? '',
  code: raw?.classCode ?? raw?.code ?? '',
  subject: raw?.subject ?? null,
  lecturers: (raw?.lecturers ?? []).map((l: any) => ({
    id: l?.id ?? '',
    name: l?.name ?? l?.fullName ?? '',
    email: l?.email ?? null,
    avatar: l?.avatar ?? null,
  })),
  students: (raw?.students ?? []).map((s: any) => ({
    id: s?.id ?? '',
    fullName: s?.fullName ?? s?.name ?? '',
    email: s?.email ?? '',
    studentCode: s?.studentCode ?? s?.studentId ?? null,
    avatar: s?.avatar ?? null,
  })),
  assignments: (raw?.assignments ?? []).map((a: any) => ({
    id: a?.id ?? '',
    title: a?.title ?? '',
    description: a?.description ?? undefined,
    status: a?.status ?? '',
    due: a?.dueDate ?? a?.due ?? null,
    maxScore: a?.totalPoints ?? a?.maxScore ?? undefined,
    type: a?.type ?? undefined,
  })),
})

export const api = {
  // ─────────────────────────────────────────────────────────────────────────
  // Auth / account — both roles
  // ─────────────────────────────────────────────────────────────────────────
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }).then((r) => {
      lowercaseRole(r.user)
      return r
    }),
  me: () => request<AuthUser>('/auth/me').then((u) => lowercaseRole(u)),
  logout: (refreshToken: string) => request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  updateProfile: (form: FormData) => request<AuthUser>('/auth/profile', { method: 'PATCH', body: form }).then((u) => lowercaseRole(u)),
  // BE's ChangePasswordSchema names the first field `oldPassword`, not `currentPassword`
  // — sending the wrong key made every attempt fail validation.
  changePassword: (body: { oldPassword: string; newPassword: string }) =>
    request<void>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  dismissPasswordChange: () => request<void>('/auth/dismiss-password-change', { method: 'POST' }),
  forgotPassword: (email: string) => request<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  // Reset is an OTP flow, not a token link: BE's ResetPasswordSchema wants the email again
  // plus the 6-digit code that was mailed out.
  resetPassword: (body: { email: string; otp: string; newPassword: string }) =>
    request<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications — both roles (broadcast: lecturer)
  // ─────────────────────────────────────────────────────────────────────────
  getNotifications: (page = 1, limit = 50) =>
    request<any[]>(`/notifications${qs({ page, limit })}`).then((r) => (r ?? []).map(toNotificationRow)),
  markNotificationRead: (id: string) => request<unknown>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request<unknown>('/notifications/read-all', { method: 'PUT' }),
  deleteNotification: (id: string) => request<unknown>(`/notifications/${id}`, { method: 'DELETE' }),
  /**
   * Send a notification. Supply `classIds` to reach the students enrolled in those classes,
   * or `targetRole` for a role-wide broadcast — the server requires exactly one of them and
   * rejects a lecturer who targets a class they do not teach (403).
   */
  broadcastNotification: (body: {
    title: string
    message: string
    classIds?: string[]
    targetRole?: BroadcastAudience
    type?: string
  }) => request<{ recipientCount?: number }>('/notifications/broadcast', { method: 'POST', body: JSON.stringify(body) }),
  /** What this account has SENT (the composer is not a recipient, so the inbox never shows it). */
  getSentNotifications: (limit = 50) =>
    request<SentNotification[]>(`/notifications/sent${qs({ limit })}`).then((r) => r ?? []),

  // ─────────────────────────────────────────────────────────────────────────
  // Overview & stats
  // ─────────────────────────────────────────────────────────────────────────
  getStatsOverview: () => request<Record<string, string | number>>('/stats/overview'),
  getStudentProgress: () => request<StudentProgress>('/stats/student-progress'),
  getStudentHistory: () => request<StudentHistoryRow[]>('/stats/student-history'),
  getLecturerReport: (classId?: string) => request<LecturerReport>(`/stats/lecturer-report${qs({ classId })}`),

  // ─────────────────────────────────────────────────────────────────────────
  // Browse / read — both roles
  // ─────────────────────────────────────────────────────────────────────────
  getClasses: (page = 1, limit = 10) => request<ClassRow[]>(`/classes${qs({ page, limit })}`),
  getSubjects: () => request<SubjectRow[]>('/subjects'),
  getSemesters: () => request<SemesterRow[]>('/semesters'),
  getSemesterSubjects: (semesterId: string) => request<SubjectRow[]>(`/semesters/${semesterId}/subjects`),
  getSemesterSubjectClasses: (semesterId: string, subjectId: string) =>
    request<ClassRow[]>(`/semesters/${semesterId}/subjects/${subjectId}/classes`),
  getAssignments: (params?: Record<string, string>) =>
    request<any[]>(`/assignments${params ? `?${new URLSearchParams(params).toString()}` : ''}`).then((r) => (r ?? []).map(toAssignmentRow)),
  getAssignment: (id: string) => request<any>(`/assignments/${id}`).then(toAssignmentRow),
  getSubmissions: (params?: Record<string, string>) =>
    request<any[]>(`/submissions${params ? `?${new URLSearchParams(params).toString()}` : ''}`).then((r) => (r ?? []).map(toSubmissionRow)),
  getSubmission: (id: string) => request<any>(`/submissions/${id}`).then(toSubmissionRow),
  /**
   * Submissions for one assignment. BE's ListSubmissionsQuery accepts `examId` (and treats
   * `assignmentId` as an alias) plus an optional `status`; a STUDENT caller is additionally
   * narrowed to their own rows server-side, so this is safe for both roles.
   */
  getSubmissionsByExam: (examId: string, status?: string) =>
    request<any[]>(`/submissions${qs({ examId, status })}`).then((r) => (r ?? []).map(toSubmissionRow)),
  getSubjectStudents: (subjectId: string) => request<any[]>(`/subjects/${subjectId}/students`).then((r) => (r ?? []).map(toStudentRow)),

  // Option lists (for pickers in lecturer forms)
  getClassOptions: () => request<OptionItem[]>('/options/classes'),
  getLecturerOptions: () => request<OptionItem[]>('/options/lecturers'),
  getAssignmentOptions: () => request<OptionItem[]>('/options/assignments'),

  // ─────────────────────────────────────────────────────────────────────────
  // STUDENT
  // ─────────────────────────────────────────────────────────────────────────
  getStudentDashboard: () => request<StudentDashboard>('/student-portal/dashboard'),
  getStudentPortalSubjects: () => request<StudentSubject[]>('/student-portal/subjects'),
  getStudentClassDetail: (id: string) => request<any>(`/student-portal/classes/${id}`).then(toClassDetail),
  submitAssignment: (body: { assignmentId: string; content: string; files?: unknown[] }) =>
    request<SubmissionRow>('/submissions', { method: 'POST', body: JSON.stringify(body) }),
  getSubmissionAiHint: (submissionId: string) => request<any>(`/submissions/${submissionId}/ai-feedback`),
  getAIFeedback: (studentId: string) => request<any>(`/ai/feedback/${studentId}`),

  // ─────────────────────────────────────────────────────────────────────────
  // LECTURER — classes
  // ─────────────────────────────────────────────────────────────────────────
  getClassCodes: () => request<OptionItem[]>('/classes/codes'),
  getClassSubjects: (semesterId?: string) => request<SubjectRow[]>(`/classes/subjects${qs({ semesterId })}`),
  createClass: (body: Record<string, unknown>) => request<ClassRow>('/classes', { method: 'POST', body: JSON.stringify(body) }),
  updateClass: (id: string, body: Record<string, unknown>) => request<ClassRow>(`/classes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateClassNote: (id: string, note: string) => request<unknown>(`/classes/${id}/note`, { method: 'PATCH', body: JSON.stringify({ note }) }),
  getClassStudents: (id: string) => request<any[]>(`/classes/${id}/students`).then((r) => (r ?? []).map(toStudentRow)),
  enrollStudents: (id: string, body: { studentIds?: string[]; studentCodes?: string[] }) =>
    request<unknown>(`/classes/${id}/enroll`, { method: 'POST', body: JSON.stringify(body) }),

  // ─────────────────────────────────────────────────────────────────────────
  // LECTURER — assignments (create/update; heavy AI authoring stays on web)
  // ─────────────────────────────────────────────────────────────────────────
  createAssignment: (form: FormData) => request<AssignmentRow>('/assignments', { method: 'POST', body: form }),
  updateAssignment: (id: string, body: Record<string, unknown>) => request<AssignmentRow>(`/assignments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // ─────────────────────────────────────────────────────────────────────────
  // LECTURER — grading & submissions
  // ─────────────────────────────────────────────────────────────────────────
  getRecentSubmissions: () => request<any[]>('/submissions/recent').then((r) => (r ?? []).map(toSubmissionRow)),
  gradeSubmission: (id: string, body: Record<string, unknown>) => request<SubmissionRow>(`/submissions/${id}/grade`, { method: 'PATCH', body: JSON.stringify(body) }),
  sendSubmissionFeedback: (id: string, body: Record<string, unknown>) => request<unknown>(`/submissions/${id}/feedback`, { method: 'POST', body: JSON.stringify(body) }),
  bulkPublishGrades: (body: { submissionIds?: string[]; examId?: string }) =>
    request<unknown>('/submissions/bulk-publish', { method: 'POST', body: JSON.stringify(body) }),

  // Grading engine — status only (the batch pipeline lives on web)
  getGradingSession: (sessionId: string) => request<GradingSession>(`/grading/sessions/${sessionId}`),
  startGrading: (body: Record<string, unknown>) => request<GradingSession>('/grading/start', { method: 'POST', body: JSON.stringify(body) }),

  // Rubric — read only
  getRubricRules: () => request<RubricRule[]>('/rubric/rules'),
  getRubricRule: (id: string) => request<RubricRule>(`/rubric/rules/${id}`),
}

// ── Types — mirror FE/src/lib/api.ts (role is lowercased at this boundary) ──
export interface AuthUser {
  id: string
  email: string
  fullName: string
  name?: string
  role: 'admin' | 'lecturer' | 'student'
  status?: string
  studentCode?: string | null
  lecturerCode?: string | null
  phone?: string | null
  avatar?: string | null
  externalId?: string | null
}
export interface AuthResult {
  token: string
  refreshToken?: string
  user: AuthUser
}
export interface ClassRow {
  id: string
  code: string
  name: string
  subject?: { id?: string; code?: string; name?: string } | null
  semester?: { id: string; code: string; name: string } | string
  lecturers?: { id: string; name: string; email: string }[]
  studentCount?: number
}
export interface SubjectRow {
  id: string
  code: string
  name: string
  description?: string
  semester?: number | string
  isActive?: boolean
}
export interface SemesterRow {
  id: string
  code: string
  name?: string
  season?: string
  isActive?: boolean
}
export interface ExamAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileType?: string
}
export interface RubricRuleRow {
  id?: string
  description?: string
  maxPoints?: number | string
  criteria?: { id?: string; description?: string; maxPoints?: number | string }[]
}
export interface AssignmentRow {
  id: string
  title: string
  type?: string
  class?: string
  classId?: string
  due?: string | null
  status: string
  description?: string
  maxScore?: number | string
  /** Full "CODE - Name" from ExamResponseDto; `class` holds just the short code. */
  subjectLabel?: string
  subjectId?: string | null
  /** Who set the assignment. ExamResponseDto sends both on every list row. */
  lecturer?: string | null
  lecturerAvatar?: string | null
  weightPercentage?: number | null
  attachments?: ExamAttachment[] | null
  rubrics?: RubricRuleRow[] | null
  latePenaltyType?: string | null
  latePenaltyValue?: number | null
  maxLatePenalty?: number | null
  allowLateSubmission?: boolean | null
}
export interface SubmissionRow {
  id: string
  assignmentId: string
  examId?: string
  submittedAt: string | null
  aiScore?: number | string | null
  /** Which attempt this is, and whether it is the current one. Resubmission bumps both. */
  attemptNumber?: number
  isLatest?: boolean
  status: string
  score?: number | null
  studentName?: string
  studentCode?: string | null
  className?: string
  assignmentTitle?: string
  /** Grading breakdown. BE nulls every score until reviewStatus is PUBLISHED. */
  isPublished?: boolean
  reviewStatus?: string
  gradingStatus?: string
  totalScore?: number | null
  rawScore?: number | null
  finalScore?: number | null
  latePenaltyAmount?: number | null
  isLate?: boolean
  daysLate?: number
  isReopened?: boolean
  reopenReason?: string | null
  /** `parsed.overallFeedback` from the AI grading report — plain text, may be long. */
  aiFeedback?: string | null
  instructorFeedback?: string | null
  gradedAt?: string | null
  zipFileUrl?: string | null
  exam?: { id?: string; title?: string; status?: string; dueDate?: string | null } | null
}
export interface NotificationRow {
  id: string
  title?: string
  message?: string
  type?: string
  referenceId?: string | null
  referenceType?: string | null
  read: boolean
  createdAt?: string | null
  /** The lecturer who sent it, resolved server-side from `createdBy` (which is only a uuid). */
  sender?: { id: string; name: string; avatar?: string | null } | null
  /** Subject + the reader's own class, derived from the referenced exam. Null on plain broadcasts. */
  subjectCode?: string | null
  subjectName?: string | null
  classCode?: string | null
}
/** BE's BroadcastNotificationParams.targetRole — there is no per-class option. */
export type BroadcastAudience = 'ALL' | 'STUDENT' | 'LECTURER'
export interface SentNotification {
  id: string
  title?: string | null
  message?: string | null
  type?: string | null
  createdAt?: string | null
  /** Which class it went to. A multi-class send writes one row per class. */
  classCode?: string | null
  /** How many inboxes it actually landed in — 0 means it reached nobody. */
  recipientCount: number
}
export interface StudentRow {
  id: string
  email: string
  fullName: string
  studentCode?: string | null
  status?: string
  avatar?: string | null
}
export interface PersonRow {
  id: string
  name: string
  email?: string | null
  avatar?: string | null
}
/** One row of `/student-portal/subjects` — a subject as the student sees it. */
export interface StudentSubject {
  id: string
  code: string
  name: string
  description?: string | null
  lecturers?: PersonRow[]
  semester?: { id: string; season?: string; code?: string; isActive?: boolean; label?: string | null } | null
  classId?: string
  classCode?: string
}
export interface OptionItem {
  id: string
  label?: string
  name?: string
  code?: string
}
export interface LecturerReport {
  avgScore: number
  submitRate: string
  passRate: string
}
export interface StudentProgress {
  gpa: number
  done: number
  rank: string
  streak: string
  history: { assignment?: string; score?: number | string | null; date?: string | null }[]
}
export interface StudentHistoryRow {
  id: string
  assignment?: string
  className?: string
  submittedAt?: string | null
  totalScore?: number | string | null
  finalScore?: number | string | null
  status?: string
}
export interface RubricRule {
  id: string
  name?: string
  description?: string
  [k: string]: unknown
}
export interface GradingSession {
  sessionId?: string
  status?: string
  [k: string]: unknown
}
export type StudentDashboard = Record<string, unknown>
/** Flattened `/student-portal/classes/:id`. */
export interface ClassDetail {
  id: string
  code: string
  subject: { id?: string; code?: string; name?: string } | null
  lecturers: PersonRow[]
  students: StudentRow[]
  assignments: {
    id: string
    title: string
    description?: string
    status: string
    due: string | null
    maxScore?: number | string
    type?: string
  }[]
}
