import { Bell, Search, User, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

interface DashboardTopbarProps {
  title?: string
  sidebarCollapsed: boolean
}

export function DashboardTopbar({ title, sidebarCollapsed }: DashboardTopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 transition-[margin] ${sidebarCollapsed ? 'ml-[72px]' : 'ml-64'}`}
    >
      {title && <p className="hidden text-sm font-medium text-slate-500 sm:block">{title}</p>}

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="search"
          placeholder="Tìm kiếm..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Thông báo"
        >
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-500" />
        </button>
        <Button variant="ghost" size="sm" className="gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <User size={16} />
          </span>
          <span className="hidden sm:inline">{user?.fullName ?? 'Tài khoản'}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          title="Đăng xuất"
        >
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  )
}
