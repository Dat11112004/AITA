import type { PublishedAssignment, SubmissionResponse } from '@/types'

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
    throw new ApiError(json.Message || json.error?.message || res.statusText || 'Lá»—i API', json.statusCode || res.status, json.error?.code)
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

  updateProfile: (data: FormData) => request<any>('/auth/profile', { method: 'PATCH', body: data }),
  dismissPasswordChange: () => request<void>('/auth/dismiss-password-change', { method: 'POST' }),
  changePassword: (body: unknown) => request<void>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (email: string) => request<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body: { email: string, otp: string, newPassword: string }) => request<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  getStatsOverview: () => request<Record<string, string | number>>('/stats/overview'),
  getActivity: () => request<ActivityLog[]>('/stats/activity'),
  getSystemHealth: () => request<Record<string, { status: string }>>('/reports/health'),

  getUsers: (role = 'all', page = 1, limit = 10, search?: string) =>
    request<UserRow[]>(`/users?role=${role}&page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getUser: (id: string) => request<any>(`/users/${id}`),
  createUser: (body: CreateUserBody) =>
    request<UserRow>('/users', { method: 'POST', body: JSON.stringify(body) }),

  getClasses: (page = 1, limit = 10) => request<ClassRow[]>(`/classes?page=${page}&limit=${limit}`),
  createClass: (body: CreateClassBody) =>
    request<ClassRow>('/classes', { method: 'POST', body: JSON.stringify(body) }),
  updateClass: (id: string, body: Partial<CreateClassBody>) =>
    request<ClassRow>(`/classes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteClass: (id: string) =>
    request<void>(`/classes/${id}`, { method: 'DELETE' }),
  getClassStudents: (classId: string) => request<StudentRow[]>(`/classes/${classId}/students`),
  getClassCodes: (semesterCode?: string, subjectCode?: string) => {
    const params = new URLSearchParams();
    if (semesterCode) params.append('semesterCode', semesterCode);
    if (subjectCode) params.append('subjectCode', subjectCode);
    return request<{ classId: string, classCode: string, studentCount: number }[]>(`/classes/codes?${params.toString()}`);
  },
  getSubjectsBySemester: (semesterCode: string) => {
    const params = new URLSearchParams({ semesterCode });
    return request<{ Id: string, SubjectCode: string, SubjectName: string }[]>(`/classes/subjects?${params.toString()}`);
  },
  updateClassNote: (classId: string, note: string) =>
    request<ClassRow>(`/classes/${classId}/note`, { method: 'PATCH', body: JSON.stringify({ note }) }),

  getAssignments: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return request<AssignmentRow[]>(`/assignments${q ? `?${q}` : ''}`)
  },
  getAssignment: (id: string) => request<AssignmentRow>(`/assignments/${id}`),
  createAssignment: (body: unknown) => {
    const isFormData = body instanceof FormData;
    return request<AssignmentRow>('/assignments', { method: 'POST', body: isFormData ? body : JSON.stringify(body) })
  },
  updateAssignment: (id: string, body: unknown) =>
    request<AssignmentRow>(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  getClassOptions: () => request<Option[]>(`/settings/options/classes`),
  getLecturerOptions: () => request<Option[]>(`/settings/options/lecturers`),

  // â”€â”€â”€ Admin: User CRUD â”€â”€â”€
  updateUser: (id: string, body: Partial<CreateUserBody> & { status?: string, updatedClasses?: { classId: string, newClassCode: string, newSubjectCode?: string }[] }) =>
    request<UserRow>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
  toggleUserLock: (id: string, locked: boolean) =>
    request<UserRow>(`/users/${id}/lock`, { method: 'PATCH', body: JSON.stringify({ locked }) }),
  importUsers: (body: { users: ImportUserRow[] } | FormData) =>
    request<any>(`/users/import`, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  importStudentsExcel: (body: FormData) =>
    request<any>(`/users/import-students-excel`, { method: 'POST', body }),
  importLecturersExcel: (body: FormData) =>
    request<any>(`/users/import-lecturers-excel`, { method: 'POST', body }),

  // â”€â”€â”€ Subjects CRUD â”€â”€â”€
  getSubjects: (page = 1, limit = 10) => request<SubjectRow[]>(`/subjects?page=${page}&limit=${limit}`),
  createSubject: (body: CreateSubjectBody) =>
    request<SubjectRow>('/subjects', { method: 'POST', body: JSON.stringify(body) }),
  updateSubject: (id: string, body: Partial<CreateSubjectBody>) =>
    request<SubjectRow>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSubject: (id: string) =>
    request<void>(`/subjects/${id}`, { method: 'DELETE' }),

  // â”€â”€â”€ Semesters CRUD â”€â”€â”€
  getSemesters: () => request<SemesterRow[]>(`/semesters`),
  createSemester: (body: CreateSemesterBody) =>
    request<SemesterRow>('/semesters', { method: 'POST', body: JSON.stringify(body) }),
  createSeason: (body: CreateSeasonBody) =>
    request<SemesterRow[]>('/semesters/season', { method: 'POST', body: JSON.stringify(body) }),
  updateSemester: (id: string, body: Partial<CreateSemesterBody>) =>
    request<SemesterRow>(`/semesters/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSemester: (id: string) =>
    request<void>(`/semesters/${id}`, { method: 'DELETE' }),

  getSemesterSubjects: (semesterId: string) => request<SubjectRow[]>(`/semesters/${semesterId}/subjects`),
  addSemesterSubjects: (semesterId: string, subjectIds: string[]) => request<void>(`/semesters/${semesterId}/subjects`, { method: 'POST', body: JSON.stringify({ subjectIds }) }),
  removeSemesterSubject: (semesterId: string, subjectId: string) => request<void>(`/semesters/${semesterId}/subjects/${subjectId}`, { method: 'DELETE' }),
  deleteSeason: (season: string) => request<void>(`/semesters/season/${encodeURIComponent(season)}`, { method: 'DELETE' }),
  getClassesBySubject: (semesterId: string, subjectId: string) => request<any[]>(`/semesters/${semesterId}/subjects/${subjectId}/classes`),

  // â”€â”€â”€ Exams CRUD â”€â”€â”€
  getExams: (page = 1, limit = 10) => request<ExamRow[]>(`/exams?page=${page}&limit=${limit}`),
  getExam: (id: string) => request<ExamRow>(`/exams/${id}`),
  createExam: (body: CreateExamBody) =>
    request<ExamRow>('/exams', { method: 'POST', body: JSON.stringify(body) }),
  updateExam: (id: string, body: Partial<CreateExamBody>) =>
    request<ExamRow>(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // â”€â”€â”€ Submissions â”€â”€â”€
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
  gradeSubmission: (submissionId: string, body: any) =>
    request<SubmissionRow>(`/submissions/${submissionId}/grade`, { method: 'PATCH', body: JSON.stringify(body) }),
  submitFeedback: (submissionId: string, feedback: string) =>
    request<void>(`/submissions/${submissionId}/feedback`, { method: 'POST', body: JSON.stringify({ feedback }) }),
  bulkPublishGrades: (assignmentId: string) =>
    request<{ success: boolean, count: number }>('/submissions/bulk-publish', { method: 'POST', body: JSON.stringify({ assignmentId }) }),

  // â”€â”€â”€ Grading & Rubric â”€â”€â”€
  startGradingSession: (assignmentId: string) =>
    request<{ sessionId: string }>('/grading/start', { method: 'POST', body: JSON.stringify({ assignmentId }) }),
  getRubricRules: () => request<any[]>('/rubric/rules'),

  // â”€â”€â”€ AI Features â”€â”€â”€
  generateExerciseAI: (body: { topic: string, difficulty: string, type: string }) =>
    request<any>('/ai/generate-exercise', { method: 'POST', body: JSON.stringify(body) }),
  generateRubricAI: (body: any) => {
    const isFormData = body instanceof FormData;
    return request<any>('/ai/generate-rubric', {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    })
  },
  saveExamRubric: (examId: string, body: any) => {
    const isFormData = body instanceof FormData;
    return request<any>(`/rubrics/exams/${examId}`, {
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

  // â”€â”€â”€ Settings â”€â”€â”€
  getSettingsConfig: () => request<any>('/settings'),
  updateSettingsConfig: (body: any) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(body) }),

  // ðŸ’¡ Notifications ðŸ’¡
  getNotifications: (page = 1, limit = 20) => request<any>(`/notifications?page=${page}&limit=${limit}`),
  markNotificationAsRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsAsRead: () => request<void>('/notifications/read-all', { method: 'PUT' }),
  broadcastNotification: (body: any) => request<any>('/notifications/broadcast', { method: 'POST', body: JSON.stringify(body) }),

  // â”€â”€â”€ Audit Logs â”€â”€â”€
  getAuditLogs: () => request<any[]>('/audit/logs'),
  getAIAuditLogs: () => request<any[]>('/audit/ai-usage'),

  // â”€â”€â”€ Reports â”€â”€â”€
  getSystemReports: () => request<any>('/reports'),
  getHealthReports: () => request<any>('/reports/health'),

}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Type Definitions
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export interface AuthUser {
  id: string
  email: string
  fullName: string
  name: string
  role: 'admin' | 'lecturer' | 'student'
  status: string
  externalId?: string | null
  avatar?: string | null
  // true khi tÃ i khoáº£n Ä‘Æ°á»£c táº¡o qua import â€” há»‡ thá»‘ng Ã©p Ä‘á»•i máº­t kháº©u láº§n Ä‘áº§u Ä‘Äƒng nháº­p
  requirePasswordChange?: boolean
}

export interface UserRow {
  id: string
  name: string
  email: string
  role: string
  status: string
  studentCode?: string
  phone?: string
  avatar?: string
  lastLoginAt?: string
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
  subject: string | { id: string; code: string; name: string }
  semester: string | { id: string; code: string }
  campus?: string
  schedule?: string
  lecturer?: AuthUser
  lecturers?: AuthUser[]
  studentCount?: number
  count?: number
  // Internal staff note â€” present only for ADMIN/LECTURER (BE omits it for students).
  note?: string | null
}

export interface CreateClassBody {
  code: string
  name: string
  subjectId: string
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
  attachments?: { id: string; fileName: string; fileUrl: string; fileType: string }[]
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
  reviewStatus?: string
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
  semester?: number
}

export interface CreateSubjectBody {
  code: string
  name: string
  description?: string
  semester?: number
}

export interface SemesterRow {
  id: string
  code: string
  season?: string
  startDate?: string
  endDate?: string
  isActive: boolean
  classCount?: number
  subjectCount?: number
}

export interface CreateSemesterBody {
  code: string
  season?: string
  startDate?: string
  endDate?: string
  isActive?: boolean
}

export interface CreateSeasonBody {
  season: string
  startDate?: string
  endDate?: string
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

export const gradingApi = {
  getAssignments: () => request<PublishedAssignment[]>('/grading/assignments'),
  clearCache: () => request<void>('/grading/cache/clear', { method: 'POST' }),
  getAssignment: (id: string) => request<PublishedAssignment>('/grading/assignments/' + id),
  deleteAssignment: (id: string) => request<void>('/grading/assignments/' + id, { method: 'DELETE' }),
  
  uploadAssignment: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<PublishedAssignment>('/grading/assignments/upload', {
      method: 'POST',
      body: formData,
    })
  },
  
  extractText: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<{ text: string }>('/grading/assignments/extract-text', {
      method: 'POST',
      body: formData,
    }).then(res => res.text)
  },
  
  generateContent: (prompt: string) => request<{ markdown: string }>('/grading/assignments/generate-content', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  }).then(res => res.markdown),
  
  parseRubric: (content: string) => request<{ rubric: any, blueprint: any }>('/grading/assignments/parse-rubric', {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
  
  parseRequirements: (content: string) => request<any>('/grading/assignments/parse-requirements', {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
  
  generateRubric: (blueprint: any) => request<{ rubric: any }>('/grading/assignments/generate-rubric', {
    method: 'POST',
    body: JSON.stringify({ blueprint }),
  }).then(res => res.rubric),
  
  publishAssignment: (metadata: any, blueprint: any, rubric: any) => request<PublishedAssignment>('/grading/assignments/publish', {
    method: 'POST',
    body: JSON.stringify({ metadata, blueprint, rubric }),
  }),
  
  submitProject: (file: File, assignmentId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (assignmentId) formData.append('assignmentId', assignmentId)
    return request<{ submissionId: string }>('/grading/submissions', {
      method: 'POST',
      body: formData,
    })
  },
  
  submitBatchProject: (files: File[], assignmentId?: string) => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    if (assignmentId) formData.append('assignmentId', assignmentId)
    return request<{ jobs: any[] }>('/grading/submissions/upload-batch', {
      method: 'POST',
      body: formData,
    })
  },
  
  getBatchStatus: (ids: string[]) => {
    if (!ids || ids.length === 0) return Promise.resolve({ statuses: {} as Record<string, any> })
    return request<{ statuses: Record<string, any> }>('/grading/submissions/batch-status?ids=' + ids.join(','))
  },
  
  subscribeToProgress: (
    submissionId: string, 
    onProgress: (job: any) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ) => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.token)
    // EventSource doesn't support headers directly in browser API. 
    // Usually tokens for SSE are passed via query params.
    const url = '/api/grading/submissions/' + submissionId + '/stream?token=' + token
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      try {
        const job = JSON.parse(event.data)
        if (job.error) {
          onError(new Error(job.error))
          eventSource.close()
          return
        }

        onProgress(job)

        if (job.state === 'completed') {
          eventSource.close()
          onComplete()
        } else if (job.state === 'failed') {
          eventSource.close()
          onError(new Error(job.error || 'Evaluation failed'))
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE Error', err)
      eventSource.close()
      onError(new Error('Connection to server lost.'))
    }

    return () => {
      eventSource.close()
    }
  },
  
  getSubmissionResult: (submissionId: string) => request<SubmissionResponse>('/grading/submissions/' + submissionId + '/result'),
  
  cancelSubmission: (submissionId: string) => request<{ success: boolean }>('/grading/submissions/' + submissionId + '/cancel', { method: 'POST' }),

  getHistory: (assignmentId?: string) => {
    const url = assignmentId ? `/grading/submissions/history?assignmentId=${assignmentId}` : '/grading/submissions/history';
    return request<{ history: any[] }>(url).then(res => res.history);
  },
  
  deleteHistory: (id: string) => request<void>('/grading/submissions/history/' + id, { method: 'DELETE' }),
}


