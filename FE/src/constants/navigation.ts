import type { NavItem } from '@/types'

export const ADMIN_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '/admin', icon: 'LayoutDashboard', category: 'General' },
  { id: 'users', label: 'Users', path: '/admin/users', icon: 'Users', category: 'Training Management' },
  { id: 'classes', label: 'Classes', path: '/admin/classes', icon: 'BookOpen', category: 'Training Management' },
  { id: 'subjects', label: 'Subjects', path: '/admin/subjects', icon: 'Library', category: 'Training Management' },
  { id: 'exams', label: 'Exams', path: '/admin/exams', icon: 'FileSignature', category: 'Training Management' },
  { id: 'reports', label: 'Reports', path: '/admin/reports', icon: 'BarChart3', category: 'Analytics & Reports' },
  { id: 'audit-logs', label: 'Audit Logs', path: '/admin/audit-logs', icon: 'FileText', category: 'Analytics & Reports' },
  { id: 'ai-config', label: 'AI Config', path: '/admin/ai-config', icon: 'Bot', category: 'System' },
  { id: 'settings', label: 'Settings', path: '/admin/settings', icon: 'Settings', category: 'System' },
]

export const LECTURER_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/lecturer', icon: 'LayoutDashboard', category: 'Chung' },
  { id: 'classes', label: 'Lớp học', path: '/lecturer/classes', icon: 'BookOpen', category: 'Đào tạo' },
  { id: 'subjects', label: 'Môn học', path: '/lecturer/subjects', icon: 'Library', category: 'Đào tạo' },
  { id: 'grading-assignments', label: 'Quản lý Bài tập', path: '/lecturer/grading/assignments', icon: 'FileCheck', category: 'Học liệu' },
  { id: 'prompts', label: 'Quản lý gợi ý prompt', path: '/lecturer/prompts', icon: 'Bot', category: 'Học liệu' },
  { id: 'settings', label: 'Cài đặt', path: '/lecturer/profile', icon: 'Settings', category: 'Hệ thống' },
]

export const STUDENT_NAV: NavItem[] = [
  { id: 'overview', label: 'Dashboard', path: '/student', icon: 'LayoutDashboard', category: 'General' },
  { id: 'courses', label: 'Subjects', path: '/student/courses', icon: 'BookOpen', category: 'Learning' },
  { id: 'classes', label: 'Classes', path: '/student/classes', icon: 'Users', category: 'Learning' },
  { id: 'subjects', label: 'Results', path: '/student/subjects', icon: 'GraduationCap', category: 'Learning' },
  { id: 'notifications', label: 'Notifications', path: '/student/notifications', icon: 'Bell', category: 'System' },
  { id: 'settings', label: 'Settings', path: '/student/profile', icon: 'Settings', category: 'System' },
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
