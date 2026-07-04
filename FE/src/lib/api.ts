export const AUTH_STORAGE_KEYS = {
  token: 'aita_token',
  user: 'aita_user',
} as const

const BASE = (import.meta as any).env.VITE_API_URL || '/api'

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.token)
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.success === false || json.statusCode >= 400) {
    throw new ApiError(json.Message || json.error?.message || res.statusText || 'Lỗi API', json.statusCode || res.status, json.error?.code)
  }
  return (json.Data !== undefined ? json.Data : json.data) as T
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(res => {
      if (res.user?.role) res.user.role = res.user.role.toLowerCase() as any
      return res
    }),

  register: (body: { email: string; password: string; fullName: string; externalId?: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(res => {
      if (res.user?.role) res.user.role = res.user.role.toLowerCase() as any
      return res
    }),

  me: () => request<AuthUser>('/auth/me').then(u => {
    if (u?.role) u.role = u.role.toLowerCase() as any
    return u
  }),

  getStatsOverview: () => request<Record<string, string | number>>('/stats/overview'),
  getActivity: () => request<ActivityLog[]>('/stats/activity'),
  getSystemHealth: () => request<Record<string, { status: string }>>('/reports/health'),

  getUsers: (role = 'all', page = 1, limit = 10) => 
    request<UserRow[]>(`/users?role=${role}&page=${page}&limit=${limit}`),
  createUser: (body: CreateUserBody) =>
    request<UserRow>('/users', { method: 'POST', body: JSON.stringify(body) }),

  getClasses: (page = 1, limit = 10) => request<ClassRow[]>(`/classes?page=${page}&limit=${limit}`),
  createClass: (body: CreateClassBody) =>
    request<ClassRow>('/classes', { method: 'POST', body: JSON.stringify(body) }),
  getClassStudents: (classId: string) => request<StudentRow[]>(`/classes/${classId}/students`),
  updateClassNote: (classId: string, note: string) =>
    request<ClassRow>(`/classes/${classId}/note`, { method: 'PATCH', body: JSON.stringify({ note }) }),

  getAssignments: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return request<AssignmentRow[]>(`/assignments${q ? `?${q}` : ''}`)
  },
  getAssignment: (id: string) => request<AssignmentRow>(`/assignments/${id}`),
  createAssignment: (body: unknown) =>
    request<AssignmentRow>('/assignments', { method: 'POST', body: JSON.stringify(body) }),
  updateAssignment: (id: string, body: unknown) =>
    request<AssignmentRow>(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  getClassOptions: () => request<Option[]>(`/settings/options/classes`),
  getLecturerOptions: () => request<Option[]>(`/settings/options/lecturers`),

  // ─── Admin: User CRUD ───
  updateUser: (id: string, body: Partial<CreateUserBody> & { status?: string }) =>
    request<UserRow>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
  toggleUserLock: (id: string, locked: boolean) =>
    request<UserRow>(`/users/${id}/lock`, { method: 'PATCH', body: JSON.stringify({ locked }) }),
  importUsers: (body: { users: ImportUserRow[] }) =>
    request<any>(`/users/import`, { method: 'POST', body: JSON.stringify(body) }),

  // ─── Subjects CRUD ───
  getSubjects: (page = 1, limit = 10) => request<SubjectRow[]>(`/subjects?page=${page}&limit=${limit}`),
  createSubject: (body: CreateSubjectBody) =>
    request<SubjectRow>('/subjects', { method: 'POST', body: JSON.stringify(body) }),
  updateSubject: (id: string, body: Partial<CreateSubjectBody>) =>
    request<SubjectRow>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSubject: (id: string) =>
    request<void>(`/subjects/${id}`, { method: 'DELETE' }),

  // ─── Semesters CRUD ───
  getSemesters: () => request<SemesterRow[]>(`/semesters`),
  createSemester: (body: CreateSemesterBody) =>
    request<SemesterRow>('/semesters', { method: 'POST', body: JSON.stringify(body) }),

  // ─── Exams CRUD ───
  getExams: (page = 1, limit = 10) => request<ExamRow[]>(`/exams?page=${page}&limit=${limit}`),
  getExam: (id: string) => request<ExamRow>(`/exams/${id}`),
  createExam: (body: CreateExamBody) =>
    request<ExamRow>('/exams', { method: 'POST', body: JSON.stringify(body) }),
  updateExam: (id: string, body: Partial<CreateExamBody>) =>
    request<ExamRow>(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // ─── Submissions ───
  async getSubmissions(params?: { assignmentId?: string; status?: string }) {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return request<SubmissionRow[]>(`/submissions?${q}`)
  },
  async getSubmission(id: string) {
    return request<SubmissionRow>(`/submissions/${id}`)
  },
  async submitAssignment(data: { assignmentId: string; content?: string; zipFileUrl?: string }) {
    return request<SubmissionRow>(`/submissions`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  async submitFeedback(submissionId: string, feedback: string) {
    return request<{ success: boolean; feedback: string }>(`/submissions/${submissionId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    })
  },
  gradeSubmission: (id: string, body: { score: number, feedback?: string, rubricScores?: Record<string, number> }) =>
    request<SubmissionRow>(`/submissions/${id}/grade`, { method: 'PATCH', body: JSON.stringify(body) }),

  // ─── Grading & Rubric ───
  startGradingSession: (assignmentId: string) =>
    request<{ sessionId: string }>('/grading/start', { method: 'POST', body: JSON.stringify({ assignmentId }) }),
  getRubricRules: () => request<any[]>('/rubric/rules'),

  // ─── AI Features ───
  generateExerciseAI: (body: { topic: string, difficulty: string, type: string }) =>
    request<any>('/ai/generate-exercise', { method: 'POST', body: JSON.stringify(body) }),
  generateRubricAI: (body: any) => {
    const isFormData = body instanceof FormData;
    return request<any>('/ai/generate-rubric', {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    })
  },
  saveAIAssignment: (body: any) =>
    request<AssignmentRow>('/ai/save-assignment', { method: 'POST', body: JSON.stringify(body) }),
  assessSubmissionAI: (submissionId: string) =>
    request<any>(`/ai/assess/${submissionId}`, { method: 'POST' }),
  getAIFeedback: (studentId: string) =>
    request<any>(`/ai/feedback/${studentId}`),
  getAIConfig: () =>
    request<any>('/ai/config'),
  updateAIConfig: (body: any) =>
    request<any>('/ai/config', { method: 'PUT', body: JSON.stringify(body) }),

  // ─── Settings ───
  getSettingsConfig: () => request<any>('/settings'),
  updateSettingsConfig: (body: any) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(body) }),

  // ─── Notifications ───
  getNotifications: (page = 1, limit = 20) => request<any>(`/notifications?page=${page}&limit=${limit}`),
  markNotificationAsRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'PUT' }),
  broadcastNotification: (body: any) => request<any>('/notifications/broadcast', { method: 'POST', body: JSON.stringify(body) }),

  // ─── Audit Logs ───
  getAuditLogs: () => request<any[]>('/audit/logs'),
  getAIAuditLogs: () => request<any[]>('/audit/ai-usage'),

  // ─── Reports ───
  getSystemReports: () => request<any>('/reports'),
  getHealthReports: () => request<any>('/reports/health'),

}

/* ═══════════════════════════════════════════
   Type Definitions
   ═══════════════════════════════════════════ */

export interface AuthUser {
  id: string
  email: string
  fullName: string
  name: string
  role: 'admin' | 'lecturer' | 'student'
  status: string
  externalId?: string | null
}

export interface UserRow {
  id: string
  name: string
  email: string
  role: string
  status: string
}

export interface ImportUserRow {
  fullName: string
  email: string
  classCode?: string
  semesterCode?: string
  subjectCode?: string
  role: 'ADMIN' | 'LECTURER' | 'STUDENT'
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED'
}

export interface CreateUserBody {
  email: string
  password: string
  fullName: string
  role: string
  externalId?: string
}

export interface ClassRow {
  id: string
  code: string
  name: string
  subject: string
  semester: string
  campus?: string
  schedule?: string
  lecturer?: AuthUser
  studentCount?: number
  count?: number
  // Internal staff note — present only for ADMIN/LECTURER (BE omits it for students).
  note?: string | null
}

export interface CreateClassBody {
  code: string
  name: string
  subjectId?: string
  semesterId?: string
  campus?: string
  schedule?: string
  lecturerId: string
}

export interface StudentRow {
  studentId: string
  name: string
  email: string
  progress: string
  grade: string
}

export interface AssignmentRow {
  id: string
  title: string
  type: string
  class?: string
  classId: string
  due?: string | null
  submitted?: number
  status: string
  description?: string
  content?: unknown
}

export interface SubmissionRow {
  id: string
  student: string
  studentId: string
  assignmentId: string
  assignment?: string
  submittedAt: string | null
  aiScore: number | string | null
  status: string
  content?: string
  language?: string
  score?: number | null
  zipFileUrl?: string
  aiFeedback?: unknown
  studentFeedback?: string
}

export interface AIReviewRow {
  id: string
  type: string
  title: string
  class: string
  createdAt: string
  status: string
}

export interface AIConfig {
  aiEndpoint: string
  aiModel: string
  aiTimeout: string
  aiStubMode: string
}

export interface ActivityLog {
  id: string
  action: string
  user: string
  createdAt: string
}

export interface Option {
  value: string
  label: string
}

export interface FeedbackRow {
  id: string
  title: string
  aiScore: number | null
  score: number | null
  feedback: unknown
  approved: boolean
}

export interface StudentProgress {
  gpa: number
  done: number
  rank: string
  streak: string
  history: { assignment: string; score: number | null; date: string | null }[]
}

export interface LearningData {
  skills: { topic: string; level: string; suggestion?: string | null }[]
  recommendations: { type: string; title: string }[]
}

export interface SubjectRow {
  id: string
  code: string
  name: string
  description?: string
  status: string
}

export interface CreateSubjectBody {
  code: string
  name: string
  description?: string
}

export interface SemesterRow {
  id: string
  code: string
  startDate?: string
  endDate?: string
  isActive: boolean
}

export interface CreateSemesterBody {
  code: string
  startDate?: string
  endDate?: string
  isActive?: boolean
}

export interface ExamRow {
  id: string
  title: string
  subject: string
  duration?: number
  status: string
  createdAt?: string
}

export interface CreateExamBody {
  title: string
  subjectId: string
  duration?: number
  description?: string
}
