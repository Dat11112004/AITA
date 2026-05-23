import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { HomePage } from '@/pages/home/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { ADMIN_NAV, LECTURER_NAV, STUDENT_NAV } from '@/constants/navigation'
import { AdminOverview } from '@/pages/admin/AdminOverview'
import { AdminUsers } from '@/pages/admin/AdminUsers'
import { AdminClasses } from '@/pages/admin/AdminClasses'
import { AdminAIModules } from '@/pages/admin/AdminAIModules'
import { AdminReports } from '@/pages/admin/AdminReports'
import { AdminSettings } from '@/pages/admin/AdminSettings'
import { LecturerOverview } from '@/pages/lecturer/LecturerOverview'
import { LecturerClasses } from '@/pages/lecturer/LecturerClasses'
import { LecturerAssignments } from '@/pages/lecturer/LecturerAssignments'
import { LecturerAIGenerate } from '@/pages/lecturer/LecturerAIGenerate'
import { LecturerGrading } from '@/pages/lecturer/LecturerGrading'
import { LecturerAIReview } from '@/pages/lecturer/LecturerAIReview'
import { LecturerReports } from '@/pages/lecturer/LecturerReports'
import { StudentOverview } from '@/pages/student/StudentOverview'
import { StudentClasses } from '@/pages/student/StudentClasses'
import { StudentAssignments } from '@/pages/student/StudentAssignments'
import { StudentSubmissions } from '@/pages/student/StudentSubmissions'
import { StudentFeedback } from '@/pages/student/StudentFeedback'
import { StudentLearning } from '@/pages/student/StudentLearning'
import { StudentProgress } from '@/pages/student/StudentProgress'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
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
        <Route path="ai-modules" element={<AdminAIModules />} />
        <Route path="reports" element={<AdminReports />} />
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
        <Route path="grading" element={<LecturerGrading />} />
        <Route path="ai-review" element={<LecturerAIReview />} />
        <Route path="reports" element={<LecturerReports />} />
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
        <Route path="classes" element={<StudentClasses />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="submissions" element={<StudentSubmissions />} />
        <Route path="feedback" element={<StudentFeedback />} />
        <Route path="learning" element={<StudentLearning />} />
        <Route path="progress" element={<StudentProgress />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
