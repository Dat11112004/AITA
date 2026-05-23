import type { NavItem } from '@/types'

export const ADMIN_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/admin', icon: 'LayoutDashboard' },
  { id: 'users', label: 'Người dùng', path: '/admin/users', icon: 'Users' },
  { id: 'classes', label: 'Lớp & Môn học', path: '/admin/classes', icon: 'GraduationCap' },
  { id: 'ai-modules', label: 'Module AI', path: '/admin/ai-modules', icon: 'Brain' },
  { id: 'reports', label: 'Báo cáo hệ thống', path: '/admin/reports', icon: 'BarChart3' },
  { id: 'settings', label: 'Cài đặt', path: '/admin/settings', icon: 'Settings' },
]

export const LECTURER_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/lecturer', icon: 'LayoutDashboard' },
  { id: 'classes', label: 'Lớp học', path: '/lecturer/classes', icon: 'BookOpen' },
  { id: 'assignments', label: 'Bài tập', path: '/lecturer/assignments', icon: 'FileText' },
  { id: 'ai-generate', label: 'Tạo bài (AI)', path: '/lecturer/ai-generate', icon: 'Sparkles' },
  { id: 'grading', label: 'Chấm bài', path: '/lecturer/grading', icon: 'CheckSquare' },
  { id: 'ai-review', label: 'Duyệt AI', path: '/lecturer/ai-review', icon: 'ShieldCheck' },
  { id: 'reports', label: 'Báo cáo', path: '/lecturer/reports', icon: 'PieChart' },
]

export const STUDENT_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/student', icon: 'LayoutDashboard' },
  { id: 'classes', label: 'Lớp của tôi', path: '/student/classes', icon: 'BookOpen' },
  { id: 'assignments', label: 'Bài tập', path: '/student/assignments', icon: 'ClipboardList' },
  { id: 'submissions', label: 'Bài nộp', path: '/student/submissions', icon: 'Upload' },
  { id: 'feedback', label: 'Phản hồi AI', path: '/student/feedback', icon: 'MessageSquare' },
  { id: 'learning', label: 'Lộ trình học', path: '/student/learning', icon: 'Route' },
  { id: 'progress', label: 'Tiến độ', path: '/student/progress', icon: 'TrendingUp' },
]

export const PUBLIC_NAV = [
  { label: 'Giới thiệu', href: '#about' },
  { label: 'Tính năng', href: '#features' },
  { label: 'Trụ cột', href: '#pillars' },
  { label: 'Tầm nhìn', href: '#vision' },
]

export const PORTAL_LINKS = [
  { role: 'admin' as const, label: 'Quản trị', path: '/login?redirect=/admin', description: 'Quản lý hệ thống & người dùng' },
  { role: 'lecturer' as const, label: 'Giảng viên', path: '/login?redirect=/lecturer', description: 'Lớp học, bài tập & chấm điểm' },
  { role: 'student' as const, label: 'Sinh viên', path: '/login?redirect=/student', description: 'Học tập & phản hồi AI' },
]
