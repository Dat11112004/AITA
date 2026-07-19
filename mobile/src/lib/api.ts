import { secureStore } from './secureStore'

// Mirrors FE/src/lib/api.ts: same envelope unwrap (Data/data), same ApiError, Vietnamese fallback message.
// Differences: BASE from EXPO_PUBLIC_API_URL, Bearer token from secure-store, and refresh-token rotation
// against the BE V2 endpoint POST /auth/refresh-token (which returns { token, refreshToken }).
//
// SCOPE: mobile is a companion app for STUDENT + LECTURER only (no ADMIN, no heavy authoring). The methods
// below cover the mobile management surface; admin/config/authoring endpoints are intentionally absent.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api'

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
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<void>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  dismissPasswordChange: () => request<void>('/auth/dismiss-password-change', { method: 'POST' }),
  forgotPassword: (email: string) => request<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body: { token: string; newPassword: string }) =>
    request<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications — both roles (broadcast: lecturer)
  // ─────────────────────────────────────────────────────────────────────────
  getNotifications: () => request<NotificationRow[]>('/notifications'),
  markNotificationRead: (id: string) => request<unknown>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request<unknown>('/notifications/read-all', { method: 'PUT' }),
  broadcastNotification: (body: { title: string; message: string; classId?: string }) =>
    request<unknown>('/notifications/broadcast', { method: 'POST', body: JSON.stringify(body) }),

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
  getAssignments: (params?: Record<string, string>) => request<AssignmentRow[]>(`/assignments${params ? `?${new URLSearchParams(params).toString()}` : ''}`),
  getAssignment: (id: string) => request<AssignmentRow>(`/assignments/${id}`),
  getSubmissions: (params?: Record<string, string>) => request<SubmissionRow[]>(`/submissions${params ? `?${new URLSearchParams(params).toString()}` : ''}`),
  getSubmission: (id: string) => request<SubmissionRow>(`/submissions/${id}`),

  // Option lists (for pickers in lecturer forms)
  getClassOptions: () => request<OptionItem[]>('/options/classes'),
  getLecturerOptions: () => request<OptionItem[]>('/options/lecturers'),
  getAssignmentOptions: () => request<OptionItem[]>('/options/assignments'),

  // ─────────────────────────────────────────────────────────────────────────
  // STUDENT
  // ─────────────────────────────────────────────────────────────────────────
  getStudentDashboard: () => request<StudentDashboard>('/student-portal/dashboard'),
  getStudentPortalSubjects: () => request<SubjectRow[]>('/student-portal/subjects'),
  getStudentClassDetail: (id: string) => request<ClassDetail>(`/student-portal/classes/${id}`),
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
  getClassStudents: (id: string) => request<StudentRow[]>(`/classes/${id}/students`),
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
  getRecentSubmissions: () => request<SubmissionRow[]>('/submissions/recent'),
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
  subject?: { id: string; code: string; name: string } | unknown
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
}
export interface SubmissionRow {
  id: string
  assignmentId: string
  submittedAt: string | null
  aiScore?: number | string | null
  status: string
  score?: number | null
  studentName?: string
  className?: string
}
export interface NotificationRow {
  id: string
  title?: string
  message?: string
  read?: boolean
  createdAt?: string
}
export interface StudentRow {
  id: string
  email: string
  fullName: string
  studentCode?: string | null
  status?: string
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
export type ClassDetail = Record<string, unknown>
