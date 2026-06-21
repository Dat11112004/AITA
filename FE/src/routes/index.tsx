import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { HomePage } from '@/pages/home/HomePage'
import { AboutPage } from '@/pages/home/AboutPage'
import { FeaturesPage } from '@/pages/home/FeaturesPage'
import { PillarsPage } from '@/pages/home/PillarsPage'
import { LoginPage } from '@/pages/LoginPage'

import { ADMIN_NAV, LECTURER_NAV, STUDENT_NAV } from '@/constants/navigation'
import { AdminOverview } from '@/pages/admin/AdminOverview'
import { AdminUsers } from '@/pages/admin/AdminUsers'
import { AdminSubjects } from '@/pages/admin/AdminSubjects'
import { AdminContentMgmt } from '@/pages/admin/AdminContentMgmt'
import { AdminReports } from '@/pages/admin/AdminReports'
import { AdminSecurityLogs } from '@/pages/admin/AdminSecurityLogs'
import { AdminNotifications } from '@/pages/admin/AdminNotifications'
import { AdminAIModules } from '@/pages/admin/AdminAIModules'
import { AdminSettings } from '@/pages/admin/AdminSettings'
import { LecturerOverview } from '@/pages/lecturer/LecturerOverview'
import { LecturerClasses } from '@/pages/lecturer/LecturerClasses'
import { LecturerAssignments } from '@/pages/lecturer/LecturerAssignments'
import { LecturerAIGenerate } from '@/pages/lecturer/LecturerAIGenerate'
import { LecturerGrading } from '@/pages/lecturer/LecturerGrading'
import { LecturerTeamwork } from '@/pages/lecturer/LecturerTeamwork'
import { LecturerNotifications } from '@/pages/lecturer/LecturerNotifications'
import { LecturerReports } from '@/pages/lecturer/LecturerReports'
import { LecturerAIReview } from '@/pages/lecturer/LecturerAIReview'
import { AdminClasses } from '@/pages/admin/AdminClasses'
import { StudentOverview } from '@/pages/student/StudentOverview'
import { StudentAssignments } from '@/pages/student/StudentAssignments'
import { StudentClasses } from '@/pages/student/StudentClasses'
import { StudentFeedback } from '@/pages/student/StudentFeedback'
import { StudentLearning } from '@/pages/student/StudentLearning'
import { StudentDiscussion } from '@/pages/student/StudentDiscussion'
import { StudentTeamwork } from '@/pages/student/StudentTeamwork'
import { StudentHistory } from '@/pages/student/StudentHistory'
import { StudentProgress } from '@/pages/student/StudentProgress'
import { StudentSubmissions } from '@/pages/student/StudentSubmissions'
import { StudentNotifications } from '@/pages/student/StudentNotifications'

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
            <DashboardLayout
              navItems={ADMIN_NAV}
              role="admin"
              roleLabel="Quản trị hệ thống"
              portalTitle="AITA Admin"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="subjects" element={<AdminSubjects />} />
        <Route path="content" element={<AdminContentMgmt />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="security-logs" element={<AdminSecurityLogs />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="ai-modules" element={<AdminAIModules />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route
        path="/lecturer"
        element={
          <ProtectedRoute allowedRole="lecturer">
            <DashboardLayout
              navItems={LECTURER_NAV}
              role="lecturer"
              roleLabel="Giảng viên"
              portalTitle="AITA Lecturer"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<LecturerOverview />} />
        <Route path="classes" element={<LecturerClasses />} />
        <Route path="assignments" element={<LecturerAssignments />} />
        <Route path="ai-generate" element={<LecturerAIGenerate />} />
        <Route path="ai-review" element={<LecturerAIReview />} />
        <Route path="grading" element={<LecturerGrading />} />
        <Route path="reports" element={<LecturerReports />} />
        <Route path="teamwork" element={<LecturerTeamwork />} />
        <Route path="notifications" element={<LecturerNotifications />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="student">
            <DashboardLayout
              navItems={STUDENT_NAV}
              role="student"
              roleLabel="Sinh viên"
              portalTitle="AITA Student"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentOverview />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="classes" element={<StudentClasses />} />
        <Route path="feedback" element={<StudentFeedback />} />
        <Route path="learning" element={<StudentLearning />} />
        <Route path="progress" element={<StudentProgress />} />
        <Route path="submissions" element={<StudentSubmissions />} />
        <Route path="discussion" element={<StudentDiscussion />} />
        <Route path="teamwork" element={<StudentTeamwork />} />
        <Route path="history" element={<StudentHistory />} />
        <Route path="notifications" element={<StudentNotifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
