import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { HomePage } from '@/pages/home/HomePage'
import { AboutPage } from '@/pages/home/AboutPage'
import { FeaturesPage } from '@/pages/home/FeaturesPage'
import { PillarsPage } from '@/pages/home/PillarsPage'
import { LoginPage } from '@/pages/LoginPage'

import { ADMIN_NAV, LECTURER_NAV, STUDENT_NAV } from '@/constants/navigation'
import { AdminOverview } from '@/pages/admin/AdminOverview'
import { AdminUsers } from '@/pages/admin/AdminUsers'
import { AdminClasses } from '@/pages/admin/AdminClasses'
import { AdminSubjects } from '@/pages/admin/AdminSubjects'
import { AdminExams } from '@/pages/admin/AdminExams'
import { AdminAIConfig } from '@/pages/admin/AdminAIConfig'
import { AdminSettings } from '@/pages/admin/AdminSettings'
import { AdminAuditLogs } from '@/pages/admin/AdminAuditLogs'
import { AdminReports } from '@/pages/admin/AdminReports'
import { AdminNotifications } from '@/pages/admin/AdminNotifications'
import { Profile } from '@/pages/profile/Profile'

import { LecturerOverview } from '@/pages/lecturer/LecturerOverview'
import { LecturerClasses } from '@/pages/lecturer/LecturerClasses'
import { LecturerClassDetail } from '@/pages/lecturer/LecturerClassDetail'
import { LecturerAssignments } from '@/pages/lecturer/LecturerAssignments'
import { LecturerSubmissions } from '@/pages/lecturer/LecturerSubmissions'
import { LecturerAIGenerator } from '@/pages/lecturer/LecturerAIGenerator'
import { LecturerAIRubric } from '@/pages/lecturer/LecturerAIRubric'
import { LecturerAssignmentRubric } from '@/pages/lecturer/LecturerAssignmentRubric'

import { StudentOverview } from '@/pages/student/StudentOverview'
import { StudentAssignments } from '@/pages/student/StudentAssignments'
import { StudentAssignmentDetail } from '@/pages/student/StudentAssignmentDetail'
import { StudentClasses } from '@/pages/student/StudentClasses'
import { StudentCourses } from '@/pages/student/StudentCourses'
import { StudentAIFeedback } from '@/pages/student/StudentAIFeedback'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="features" element={<FeaturesPage />} />
        <Route path="pillars" element={<PillarsPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <ErrorBoundary>
              <DashboardLayout
                navItems={ADMIN_NAV}
                role="admin"
                roleLabel="Quản trị hệ thống"
                portalTitle="AITA Admin"
              />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="subjects" element={<AdminSubjects />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="ai-config" element={<AdminAIConfig />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="/lecturer"
        element={
          <ProtectedRoute allowedRole="lecturer">
            <ErrorBoundary>
              <DashboardLayout
                navItems={LECTURER_NAV}
                role="lecturer"
                roleLabel="Giảng viên"
                portalTitle="AITA Lecturer"
              />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<LecturerOverview />} />
        <Route path="classes" element={<LecturerClasses />} />
        <Route path="classes/:id" element={<LecturerClassDetail />} />
        <Route path="assignments" element={<LecturerAssignments />} />
        <Route path="assignments/:id/rubric" element={<LecturerAssignmentRubric />} />
        {/* Nav "Kỳ thi" — chưa có trang riêng, dùng chung trang bài tập (tạo/lọc Đề thi tại đây) */}
        <Route path="exams" element={<LecturerAssignments />} />
        <Route path="assignments/ai-generator" element={<LecturerAIGenerator />} />
        <Route path="rubric-generator" element={<LecturerAIRubric />} />
        <Route path="assignments/:id/submissions" element={<LecturerSubmissions />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="student">
            <ErrorBoundary>
              <DashboardLayout
                navItems={STUDENT_NAV}
                role="student"
                roleLabel="Sinh viên"
                portalTitle="AITA Student"
              />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentOverview />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="assignments/:id" element={<StudentAssignmentDetail />} />
        <Route path="assignments/:id/feedback" element={<StudentAIFeedback />} />
        <Route path="classes" element={<StudentClasses />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="ai-feedback" element={<StudentAIFeedback />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
