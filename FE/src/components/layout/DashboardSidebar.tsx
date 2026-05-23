import { Link, useLocation } from 'react-router-dom'
import { GraduationCap, Home, ChevronLeft, ChevronRight } from 'lucide-react'
import type { NavItem, UserRole } from '@/types'
import { Icon } from '@/components/icons/IconMap'

interface DashboardSidebarProps {
  navItems: NavItem[]
  role: UserRole
  roleLabel: string
  collapsed: boolean
  onToggleCollapse: () => void
}

const roleColors: Record<UserRole, string> = {
  admin: 'from-slate-800 to-slate-900',
  lecturer: 'from-brand-800 to-brand-900',
  student: 'from-emerald-800 to-teal-900',
}

export function DashboardSidebar({
  navItems,
  role,
  roleLabel,
  collapsed,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const location = useLocation()

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-gradient-to-b ${roleColors[role]} text-white transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'}`}
    >
      <div className={`flex items-center gap-2 border-b border-white/10 p-4 ${collapsed ? 'justify-center' : ''}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <GraduationCap size={20} />
        </span>
        {!collapsed && (
          <div>
            <p className="font-bold leading-tight">AITA</p>
            <p className="text-xs text-white/70">{roleLabel}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path !== `/${role}` && location.pathname.startsWith(item.path))
          return (
            <Link
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-white/20 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon name={item.icon} size={20} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto rounded-full bg-accent-500 px-2 py-0.5 text-xs">{item.badge}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          to="/"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center' : ''}`}
        >
          <Home size={20} />
          {!collapsed && <span>Trang chủ</span>}
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && <span>Thu gọn</span>}
        </button>
      </div>
    </aside>
  )
}
