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
  const token = localStorage.getItem('aita_token')
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.success === false) {
    throw new ApiError(json.error?.message || res.statusText || 'Lỗi API', res.status, json.error?.code)
  }
  return json.data as T
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (body: { email: string; password: string; fullName: string; externalId?: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => request<AuthUser>('/auth/me'),

  getStatsOverview: () => request<Record<string, string | number>>('/stats/overview'),
  getActivity: () => request<ActivityLog[]>('/stats/activity'),
  getSystemHealth: () => request<Record<string, { status: string }>>('/system/health'),

  getUsers: (role = 'all') => request<UserRow[]>(`/users?role=${role}`),
  createUser: (body: CreateUserBody) =>
    request<UserRow>('/users', { method: 'POST', body: JSON.stringify(body) }),

  getClasses: () => request<ClassRow[]>('/classes'),
  createClass: (body: CreateClassBody) =>
    request<ClassRow>('/classes', { method: 'POST', body: JSON.stringify(body) }),
  getClassStudents: (classId: string) => request<StudentRow[]>(`/classes/${classId}/students`),

  getAssignments: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return request<AssignmentRow[]>(`/assignments${q ? `?${q}` : ''}`)
  },
  createAssignment: (body: unknown) =>
    request<AssignmentRow>('/assignments', { method: 'POST', body: JSON.stringify(body) }),
  updateAssignment: (id: string, body: unknown) =>
    request<AssignmentRow>(`/assignments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getSubmissions: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return request<SubmissionRow[]>(`/submissions${q ? `?${q}` : ''}`)
  },
  getRecentSubmissions: (limit = 5) =>
    request<SubmissionRow[]>(`/submissions/recent?limit=${limit}`),
  getSubmission: (id: string) => request<SubmissionRow>(`/submissions/${id}`),
  submitWork: (body: { assignmentId: string; content?: string; language?: string; groupCode?: string }) =>
    request<SubmissionRow>('/submissions', { method: 'POST', body: JSON.stringify(body) }),
  publishSubmission: (id: string, score?: number) =>
    request<SubmissionRow>(`/submissions/${id}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ score }),
    }),

  generateExercise: (body: unknown) =>
    request<{ result: unknown; assignment: AssignmentRow | null }>('/ai/generate-exercise', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  saveAIAssignment: (body: unknown) =>
    request<AssignmentRow>('/ai/save-assignment', { method: 'POST', body: JSON.stringify(body) }),
  assessSubmission: (submissionId: string) =>
    request<{ submission: SubmissionRow; aiScore: number; feedback: unknown }>(
      `/ai/assess/${submissionId}`,
      { method: 'POST' },
    ),
  getAIReviews: () => request<AIReviewRow[]>('/ai/reviews'),
  reviewAIJob: (jobId: string, approved: boolean, note?: string) =>
    request(`/ai/reviews/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify({ approved, note }),
    }),
  getAIConfig: () => request<AIConfig>('/ai/config'),
  updateAIConfig: (body: Record<string, string>) =>
    request('/ai/config', { method: 'PUT', body: JSON.stringify(body) }),

  getSettings: () => request<Record<string, string>>('/settings'),
  updateSettings: (body: Record<string, string>) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(body) }),

  getAdminReport: (period: string) => request<unknown>(`/reports/admin?period=${period}`),
  getLecturerReport: (classId?: string) =>
    request<{ avgScore: number; submitRate: string; passRate: string }>(
      `/reports/lecturer${classId ? `?classId=${classId}` : ''}`,
    ),

  getStudentProgress: () => request<StudentProgress>('/student/progress'),
  getStudentFeedback: () => request<FeedbackRow[]>('/student/feedback'),
  getStudentLearning: () => request<LearningData>('/student/learning'),

  getClassOptions: () => request<Option[]>(`/options/classes`),
  getAssignmentOptions: (classId?: string) =>
    request<Option[]>(`/options/assignments${classId ? `?classId=${classId}` : ''}`),
  getLecturerOptions: () => request<Option[]>(`/options/lecturers`),

  // ─── Admin: User CRUD ───
  updateUser: (id: string, body: Partial<CreateUserBody> & { status?: string }) =>
    request<UserRow>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
  toggleUserLock: (id: string, locked: boolean) =>
    request<UserRow>(`/users/${id}/lock`, { method: 'PATCH', body: JSON.stringify({ locked }) }),

  // ─── Admin: Subjects ───
  getSubjects: () => request<SubjectRow[]>('/subjects'),
  createSubject: (body: CreateSubjectBody) =>
    request<SubjectRow>('/subjects', { method: 'POST', body: JSON.stringify(body) }),
  updateSubject: (id: string, body: Partial<CreateSubjectBody>) =>
    request<SubjectRow>(`/subjects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSubject: (id: string) =>
    request<void>(`/subjects/${id}`, { method: 'DELETE' }),

  // ─── Admin: Content Management ───
  getContents: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return request<ContentRow[]>(`/contents${q ? `?${q}` : ''}`)
  },
  createContent: (body: CreateContentBody) =>
    request<ContentRow>('/contents', { method: 'POST', body: JSON.stringify(body) }),
  updateContent: (id: string, body: Partial<CreateContentBody>) =>
    request<ContentRow>(`/contents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteContent: (id: string) =>
    request<void>(`/contents/${id}`, { method: 'DELETE' }),

  // ─── Admin: Security Logs ───
  getSecurityLogs: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return request<SecurityLog[]>(`/security/logs${q ? `?${q}` : ''}`)
  },

  // ─── Admin: Notifications ───
  getNotifications: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return request<NotificationRow[]>(`/notifications${q ? `?${q}` : ''}`)
  },
  sendNotification: (body: SendNotificationBody) =>
    request<NotificationRow>('/notifications', { method: 'POST', body: JSON.stringify(body) }),
  markNotificationRead: (id: string) =>
    request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),

  // ─── Lecturer: Teamwork ───
  getTeamworkData: (classId?: string) => {
    const q = classId ? `?classId=${classId}` : ''
    return request<TeamworkData>(`/teamwork${q}`)
  },

  // ─── Student: Discussion ───
  getDiscussionThreads: (classId?: string) => {
    const q = classId ? `?classId=${classId}` : ''
    return request<DiscussionThread[]>(`/discussions${q}`)
  },
  createDiscussionThread: (body: { classId: string; title: string; content: string }) =>
    request<DiscussionThread>('/discussions', { method: 'POST', body: JSON.stringify(body) }),
  replyToThread: (threadId: string, body: { content: string }) =>
    request<DiscussionReply>(`/discussions/${threadId}/replies`, { method: 'POST', body: JSON.stringify(body) }),

  // ─── Student: Assignment History ───
  getSubmissionHistory: () => request<SubmissionHistoryRow[]>('/student/history'),

  // ─── Student: Teamwork ───
  getStudentTeamwork: () => request<StudentTeamData>('/student/teamwork'),
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
  studentCount: number
  count?: number
}

export interface CreateClassBody {
  code: string
  name: string
  subject?: string
  semester?: string
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
  class: string
  classId: string
  due: string | null
  submitted: number
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
  aiFeedback?: unknown
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

// ─── New types ───

export interface SubjectRow {
  id: string
  code: string
  name: string
  difficulty: string
  description: string
  codeExamples?: string
  curriculum?: string
  createdAt: string
}

export interface CreateSubjectBody {
  code: string
  name: string
  difficulty: string
  description: string
  codeExamples?: string
  curriculum?: string
}

export interface ContentRow {
  id: string
  title: string
  category: string
  body: string
  status: 'draft' | 'published' | 'archived'
  author: string
  publishAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateContentBody {
  title: string
  category: string
  body: string
  status?: 'draft' | 'published'
  publishAt?: string | null
}

export interface SecurityLog {
  id: string
  action: string
  user: string
  ip: string
  detail: string
  level: 'info' | 'warning' | 'danger'
  createdAt: string
}

export interface NotificationRow {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'urgent' | 'grade' | 'deadline'
  target: string
  read: boolean
  createdAt: string
}

export interface SendNotificationBody {
  title: string
  message: string
  type: string
  targetRole?: string
  targetClassId?: string
}

export interface TeamworkData {
  teams: TeamInfo[]
}

export interface TeamInfo {
  id: string
  name: string
  assignment: string
  members: TeamMember[]
}

export interface TeamMember {
  id: string
  name: string
  commits: number
  linesAdded: number
  linesRemoved: number
  contributionPercent: number
  lastActive: string
}

export interface DiscussionThread {
  id: string
  classId: string
  className?: string
  title: string
  content: string
  author: string
  authorRole: string
  replies: DiscussionReply[]
  resolved: boolean
  createdAt: string
}

export interface DiscussionReply {
  id: string
  content: string
  author: string
  authorRole: string
  createdAt: string
}

export interface SubmissionHistoryRow {
  id: string
  assignment: string
  className: string
  submittedAt: string
  score: number | null
  aiScore: number | null
  status: string
  feedback?: string
  language?: string
}

export interface StudentTeamData {
  teams: StudentTeamInfo[]
}

export interface StudentTeamInfo {
  id: string
  name: string
  assignment: string
  className: string
  members: { id: string; name: string; role: string; contributionPercent: number }[]
  myContribution: number
  status: string
}
