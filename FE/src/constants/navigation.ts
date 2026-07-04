import type { NavItem } from '@/types'

export const ADMIN_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/admin', icon: 'LayoutDashboard' },
  { id: 'users', label: 'Người dùng', path: '/admin/users', icon: 'Users' },
  { id: 'classes', label: 'Lớp học', path: '/admin/classes', icon: 'BookOpen' },
  { id: 'subjects', label: 'Môn học', path: '/admin/subjects', icon: 'Library' },
  { id: 'exams', label: 'Kỳ thi', path: '/admin/exams', icon: 'FileSignature' },
  { id: 'reports', label: 'Báo cáo', path: '/admin/reports', icon: 'BarChart3' },
  { id: 'audit-logs', label: 'Nhật ký', path: '/admin/audit-logs', icon: 'FileText' },
  { id: 'ai-config', label: 'Cấu hình AI', path: '/admin/ai-config', icon: 'Bot' },
  { id: 'settings', label: 'Cài đặt', path: '/admin/settings', icon: 'Settings' },
  { id: 'notifications', label: 'Thông báo', path: '/admin/notifications', icon: 'BellRing' },
  { id: 'profile', label: 'Hồ sơ', path: '/admin/profile', icon: 'UserCircle' },
]

export const LECTURER_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/lecturer', icon: 'LayoutDashboard' },
  { id: 'classes', label: 'Lớp học', path: '/lecturer/classes', icon: 'BookOpen' },
  { id: 'assignments', label: 'Bài tập', path: '/lecturer/assignments', icon: 'FileText' },
  { id: 'exams', label: 'Kỳ thi', path: '/lecturer/exams', icon: 'FileSignature' },
  { id: 'profile', label: 'Hồ sơ', path: '/lecturer/profile', icon: 'UserCircle' },
]

export const STUDENT_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/student', icon: 'LayoutDashboard' },
  { id: 'courses', label: 'Khóa học', path: '/student/courses', icon: 'BookOpen' },
  { id: 'classes', label: 'Bảng điểm', path: '/student/classes', icon: 'GraduationCap' },
  { id: 'assignments', label: 'Bài tập', path: '/student/assignments', icon: 'ClipboardList' },
  { id: 'profile', label: 'Hồ sơ', path: '/student/profile', icon: 'UserCircle' },
]

export const PUBLIC_NAV = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Giới thiệu', href: '/about' },
  { label: 'Tính năng', href: '/features' },
  { label: 'Demo', href: '/pillars' },
]

export const PORTAL_LINKS = [
  { role: 'lecturer' as const, label: 'Giảng viên', path: '/login?redirect=/lecturer', description: 'Lớp học, bài tập & chấm điểm' },
  { role: 'student' as const, label: 'Sinh viên', path: '/login?redirect=/student', description: 'Học tập & phản hồi AI' },
]
