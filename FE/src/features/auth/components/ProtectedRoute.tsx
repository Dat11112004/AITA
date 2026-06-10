import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import type { UserRole } from '@/types'

const rolePath: Record<UserRole, string> = {
  admin: '/admin',
  lecturer: '/lecturer',
  student: '/student',
}

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRole: UserRole
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, loading, token } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Đang tải...
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (user.role !== allowedRole) {
    const defaultPath = rolePath[user.role as UserRole] || '/'
    return <Navigate to={defaultPath} replace />
  }

  return <>{children}</>
}
