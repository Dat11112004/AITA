import type { AssignmentRow, AuthUser, ClassRow } from './api'

// DEV-ONLY preview mode for UI/UX review without a backend (e.g. `expo start --web`, where the BE's
// CORS blocks Metro's origin). Enabled only when EXPO_PUBLIC_DEV_PREVIEW === '1'. The real auth/data
// path is unaffected when the flag is off. Safe to delete once on-device review against the BE is set up.
export const DEV_PREVIEW = process.env.EXPO_PUBLIC_DEV_PREVIEW === '1'

// DEV-ONLY autologin against the REAL backend: skips the login screen by signing in
// with the seeded test account on boot (BE dev server upserts it — see be/src/database/dev-seed.ts).
// Unlike DEV_PREVIEW this uses real API data end-to-end. Off unless explicitly '1'.
export const DEV_AUTOLOGIN = process.env.EXPO_PUBLIC_DEV_AUTOLOGIN === '1'
export const DEV_LOGIN_EMAIL = process.env.EXPO_PUBLIC_DEV_LOGIN_EMAIL || 'student@fpt.edu.vn'
export const DEV_LOGIN_PASSWORD = process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD || 'student123'

export const mockUser: AuthUser = {
  id: 'dev-student-1',
  email: 'student@fpt.edu.vn',
  fullName: 'Nguyễn Văn An',
  role: 'student',
  status: 'active',
}

export const mockOverview: Record<string, string | number> = {
  classes: 3,
  assignments: 5,
  submissions: 4,
  averageScore: 7.8,
}

export const mockClasses: ClassRow[] = [
  { id: 'c1', code: 'SE1702', name: 'Lập trình di động', studentCount: 32 },
  { id: 'c2', code: 'PRM392', name: 'Lập trình đa nền tảng', studentCount: 28 },
  { id: 'c3', code: 'SWD392', name: 'Thiết kế hệ thống phần mềm', studentCount: 35 },
]

// Due dates are anchored to "now" rather than hard-coded. Fixed dates rot: the previous
// literals (2026-07-02…) had all fallen into the past, so every card in the preview rendered
// "Quá hạn" in red and the deadline styling could never be reviewed.
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

export const mockAssignments: AssignmentRow[] = [
  { id: 'a1', title: 'Bài tập 3 — REST API', status: 'PUBLISHED', due: inHours(34), classId: 'c1', class: 'SE1702', description: 'Xây dựng REST API cho hệ thống quản lý thư viện bằng Express: CRUD sách, xác thực JWT, phân trang. Nộp mã nguồn dưới dạng .zip.' },
  { id: 'a2', title: 'Đồ án nhóm — Màn hình đăng nhập', status: 'PUBLISHED', due: inHours(5 * 24), classId: 'c2', class: 'PRM392', description: 'Thiết kế và lập trình màn hình đăng nhập đa nền tảng (React Native). Làm việc theo nhóm 3–4 sinh viên; nộp link Git của nhóm.' },
  { id: 'a3', title: 'Quiz 2 — State management', status: 'PUBLISHED', due: inHours(11 * 24), classId: 'c1', class: 'SE1702', description: 'Trắc nghiệm về quản lý state: Context, Redux và các pattern phổ biến. 20 câu, 30 phút.' },
  { id: 'a4', title: 'Bài tập 2 — Component cơ bản', status: 'CLOSED', due: inHours(-27 * 24), classId: 'c1', class: 'SE1702', description: 'Xây dựng các component cơ bản và styling theo design. (Bài tập đã hết hạn nộp.)' },
]

export const getMockAssignment = (id: string): AssignmentRow | undefined => mockAssignments.find((a) => a.id === id)
