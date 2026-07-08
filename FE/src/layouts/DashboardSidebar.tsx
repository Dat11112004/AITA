import { Link, useLocation } from 'react-router-dom'
import { GraduationCap, Home, ChevronLeft, ChevronRight } from 'lucide-react'
import type { NavItem, UserRole } from '@/types'
import { Icon } from '@/components/icons/IconMap'

interface Props {
  navItems: NavItem[]
  role: UserRole
  roleLabel: string
  collapsed: boolean
  onToggleCollapse: () => void
}

/* ── Per-role sidebar themes ─────────────────────────────────── */
const sidebarTheme: Record<UserRole, {
  bg: string
  logoRing: string
  activeBg: string
  activeBar: string
  hoverBg: string
}> = {
  admin: {
    bg:        'bg-[#0f172a]', // slate-900
    logoRing:  'bg-brand-600',
    activeBg:  'bg-white/10',
    activeBar: 'bg-brand-400',
    hoverBg:   'hover:bg-white/5',
  },
  lecturer: {
    bg:        'bg-[#0f172a]',
    logoRing:  'bg-brand-600',
    activeBg:  'bg-brand-500/15',
    activeBar: 'bg-brand-400',
    hoverBg:   'hover:bg-white/5',
  },
  student: {
    bg:        'bg-[#0f172a]',
    logoRing:  'bg-brand-600',
    activeBg:  'bg-brand-500/15',
    activeBar: 'bg-brand-400',
    hoverBg:   'hover:bg-white/5',
  },
}

export function DashboardSidebar({ navItems, role, roleLabel, collapsed, onToggleCollapse }: Props) {
  const location = useLocation()
  const theme = sidebarTheme[role]

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 flex h-screen flex-col text-white
        ${theme.bg}
        transition-all duration-300 ease-in-out
        shadow-2xl shadow-black/30
        ${collapsed ? 'w-[68px]' : 'w-64'}
      `}
    >
      {/* ── Logo ─────────────────────────────────── */}
      <div className={`flex h-16 shrink-0 items-center border-b border-white/[0.08] px-4 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${theme.logoRing}`}>
          <GraduationCap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-white leading-none">AITA</p>
            <p className="mt-0.5 truncate text-[11px] text-white/50 leading-none">{roleLabel}</p>
          </div>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== `/${role}` && location.pathname.startsWith(item.path))

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`
                group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                outline-none select-none transition-all duration-150
                focus-visible:ring-2 focus-visible:ring-white/30
                ${isActive
                  ? `${theme.activeBg} text-white`
                  : `text-white/55 ${theme.hoverBg} hover:text-white`
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              {/* Active bar */}
              {isActive && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full ${theme.activeBar}`} />
              )}

              <Icon
                name={item.icon}
                size={19}
                className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${isActive ? 'text-white' : 'text-white/45 group-hover:text-white/80'}`}
              />

              {!collapsed && (
                <span className="truncate leading-none">{item.label}</span>
              )}

              {!collapsed && item.badge && (
                <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                  {item.badge}
                </span>
              )}

              {/* Tooltip when collapsed */}
              {collapsed && (
                <div className="
                  pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50
                  whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5
                  text-xs font-medium text-white shadow-xl
                  border border-white/10
                  opacity-0 scale-95 origin-left
                  group-hover:opacity-100 group-hover:scale-100
                  transition-all duration-150
                ">
                  {item.label}
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Footer ───────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[0.08] px-2 py-3 space-y-0.5">
        <Link
          to="/"
          className={`
            group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm
            text-white/50 ${theme.hoverBg} hover:text-white
            transition-all duration-150
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <Home size={18} className="shrink-0 transition-transform group-hover:scale-105" />
          {!collapsed && <span>Trang chủ</span>}
          {collapsed && (
            <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              Trang chủ
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={onToggleCollapse}
          className={`
            flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm
            text-white/50 ${theme.hoverBg} hover:text-white
            transition-all duration-150
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Thu gọn</span></>}
        </button>
      </div>
    </aside>
  )
}
