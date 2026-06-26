import type { NavItem } from '@/types'

export const ADMIN_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/admin', icon: 'LayoutDashboard' },
  { id: 'users', label: 'Người dùng', path: '/admin/users', icon: 'Users' },
  { id: 'classes', label: 'Lớp học', path: '/admin/classes', icon: 'BookOpen' },
  { id: 'subjects', label: 'Môn học', path: '/admin/subjects', icon: 'BookOpen' },
  { id: 'reports', label: 'Phân tích', path: '/admin/reports', icon: 'BarChart3' },
  { id: 'security', label: 'Bảo mật & Logs', path: '/admin/security-logs', icon: 'Shield' },
  { id: 'notifications', label: 'Thông báo', path: '/admin/notifications', icon: 'Bell' },
  { id: 'ai-modules', label: 'Module AI', path: '/admin/ai-modules', icon: 'Brain' },
  { id: 'settings', label: 'Cài đặt', path: '/admin/settings', icon: 'Settings' },
]

export const LECTURER_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/lecturer', icon: 'LayoutDashboard' },
  { id: 'classes', label: 'Lớp học', path: '/lecturer/classes', icon: 'BookOpen' },
  { id: 'assignments', label: 'Bài tập', path: '/lecturer/assignments', icon: 'FileText' },
  { id: 'ai-generate', label: 'Tạo bài (AI)', path: '/lecturer/ai-generate', icon: 'Sparkles' },
  { id: 'grading', label: 'Chấm bài', path: '/lecturer/grading', icon: 'CheckSquare' },
  { id: 'teamwork', label: 'Đánh giá nhóm', path: '/lecturer/teamwork', icon: 'Users' },
  { id: 'reports', label: 'Báo cáo', path: '/lecturer/reports', icon: 'BarChart3' },
  { id: 'notifications', label: 'Thông báo', path: '/lecturer/notifications', icon: 'Bell' },
]

export const STUDENT_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/student', icon: 'LayoutDashboard' },
  { id: 'classes', label: 'Lớp học', path: '/student/classes', icon: 'BookOpen' },
  { id: 'assignments', label: 'Bài tập', path: '/student/assignments', icon: 'ClipboardList' },
  { id: 'submissions', label: 'Bài nộp', path: '/student/submissions', icon: 'FileCheck' },
  { id: 'progress', label: 'Tiến độ', path: '/student/progress', icon: 'TrendingUp' },
  { id: 'learning', label: 'Lộ trình học', path: '/student/learning', icon: 'Route' },
  { id: 'feedback', label: 'Phản hồi AI', path: '/student/feedback', icon: 'MessageSquare' },
  { id: 'teamwork', label: 'Làm việc nhóm', path: '/student/teamwork', icon: 'Users' },
  { id: 'history', label: 'Lịch sử nộp', path: '/student/history', icon: 'History' },
  { id: 'notifications', label: 'Thông báo', path: '/student/notifications', icon: 'Bell' },
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
