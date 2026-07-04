import { secureStore } from './secureStore'

// Mirrors FE/src/lib/api.ts: same envelope unwrap (Data/data), same ApiError, Vietnamese fallback message.
// Differences: BASE from EXPO_PUBLIC_API_URL, Bearer token from secure-store, and refresh-token rotation
// against the BE V2 endpoint POST /auth/refresh-token (which returns { token, refreshToken }).
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
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
    throw new ApiError(
      json.Message || json.error?.message || res.statusText || 'Lỗi API',
      json.statusCode || res.status,
      json.error?.code,
    )
  }
  return (json.Data !== undefined ? json.Data : json.data) as T
}

const lowercaseRole = <T extends { role?: string } | null | undefined>(u: T): T => {
  if (u && (u as any).role) (u as any).role = String((u as any).role).toLowerCase()
  return u
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }).then((r) => {
      lowercaseRole(r.user)
      return r
    }),
  me: () => request<AuthUser>('/auth/me').then((u) => lowercaseRole(u)),
  logout: (refreshToken: string) =>
    request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  // ── v1 Student read surface (reused 1:1 from the web BE contract) ──
  getStatsOverview: () => request<Record<string, string | number>>('/stats/overview'),
  getClasses: (page = 1, limit = 10) => request<ClassRow[]>(`/classes?page=${page}&limit=${limit}`),
  getAssignments: (params?: Record<string, string>) =>
    request<AssignmentRow[]>(`/assignments${params ? `?${new URLSearchParams(params).toString()}` : ''}`),
  getAssignment: (id: string) => request<AssignmentRow>(`/assignments/${id}`),
  getSubmissions: (params?: Record<string, string>) =>
    request<SubmissionRow[]>(`/submissions${params ? `?${new URLSearchParams(params).toString()}` : ''}`),
  submitAssignment: (body: { assignmentId: string; content: string; files?: unknown[] }) =>
    request<SubmissionRow>('/submissions', { method: 'POST', body: JSON.stringify(body) }),
  getAIFeedback: (studentId: string) => request<any>(`/ai/feedback/${studentId}`),
  getNotifications: () => request<NotificationRow[]>('/notifications'),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
}

// ── Types — mirror FE/src/lib/api.ts (role is lowercased at this boundary) ──
export interface AuthUser {
  id: string
  email: string
  fullName: string
  name?: string
  role: 'admin' | 'lecturer' | 'student'
  status?: string
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
  subject?: unknown
  semester?: string
  studentCount?: number
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
}
export interface SubmissionRow {
  id: string
  assignmentId: string
  submittedAt: string | null
  aiScore?: number | string | null
  status: string
  score?: number | null
}
export interface NotificationRow {
  id: string
  title?: string
  message?: string
  read?: boolean
  createdAt?: string
}
