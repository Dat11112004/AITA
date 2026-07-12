import type { NavItem } from '@/types'

export const ADMIN_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/admin', icon: 'LayoutDashboard', category: 'Chung' },
  { id: 'users', label: 'Người dùng', path: '/admin/users', icon: 'Users', category: 'Quản lý Đào tạo' },
  { id: 'classes', label: 'Lớp học', path: '/admin/classes', icon: 'BookOpen', category: 'Quản lý Đào tạo' },
  { id: 'subjects', label: 'Môn học', path: '/admin/subjects', icon: 'Library', category: 'Quản lý Đào tạo' },
  { id: 'exams', label: 'Kỳ thi', path: '/admin/exams', icon: 'FileSignature', category: 'Quản lý Đào tạo' },
  { id: 'reports', label: 'Báo cáo', path: '/admin/reports', icon: 'BarChart3', category: 'Phân tích & Báo cáo' },
  { id: 'audit-logs', label: 'Nhật ký', path: '/admin/audit-logs', icon: 'FileText', category: 'Phân tích & Báo cáo' },
  { id: 'ai-config', label: 'Cấu hình AI', path: '/admin/ai-config', icon: 'Bot', category: 'Hệ thống' },
  { id: 'settings', label: 'Cài đặt', path: '/admin/settings', icon: 'Settings', category: 'Hệ thống' },
]

export const LECTURER_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/lecturer', icon: 'LayoutDashboard', category: 'Chung' },
  { id: 'classes', label: 'Lớp học', path: '/lecturer/classes', icon: 'BookOpen', category: 'Đào tạo' },
  { id: 'grading-assignments', label: 'Quản lý Bài tập', path: '/lecturer/grading/assignments', icon: 'FileCheck', category: 'Học liệu' },
  { id: 'teamwork', label: 'Đánh giá Nhóm', path: '/lecturer/grading/teamwork', icon: 'Users', category: 'Chấm điểm' },
]

export const STUDENT_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/student', icon: 'LayoutDashboard', category: 'Chung' },
  { id: 'courses', label: 'Khóa học', path: '/student/courses', icon: 'BookOpen', category: 'Học tập' },
  { id: 'classes', label: 'Bảng điểm', path: '/student/classes', icon: 'GraduationCap', category: 'Học tập' },
  { id: 'assignments', label: 'Bài tập', path: '/student/assignments', icon: 'ClipboardList', category: 'Đánh giá & Chấm điểm' },
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
