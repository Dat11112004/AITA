import { Link, useLocation } from 'react-router-dom'
import { GraduationCap, Home, ChevronLeft, ChevronRight } from 'lucide-react'
import type { NavItem, UserRole } from '@/types'
import { Icon } from '@/components/icons/IconMap'
import { useTranslation } from 'react-i18next'

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
    bg:        'bg-slate-900', // Deep dark blue
    logoRing:  'bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20',
    activeBg:  'bg-gradient-to-r from-brand-500/15 to-transparent border border-brand-500/20',
    activeBar: 'bg-brand-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]',
    hoverBg:   'hover:bg-slate-800/50',
  },
  lecturer: {
    bg:        'bg-slate-900',
    logoRing:  'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20',
    activeBg:  'bg-gradient-to-r from-emerald-500/15 to-transparent border border-emerald-500/20',
    activeBar: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]',
    hoverBg:   'hover:bg-slate-800/50',
  },
  student: {
    bg:        'bg-slate-900',
    logoRing:  'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg shadow-indigo-500/20',
    activeBg:  'bg-gradient-to-r from-indigo-500/15 to-transparent border border-indigo-500/20',
    activeBar: 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]',
    hoverBg:   'hover:bg-slate-800/50',
  },
}

export function DashboardSidebar({ navItems, role, roleLabel, collapsed, onToggleCollapse }: Props) {
  const { t } = useTranslation()
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
        {navItems.map((item, index) => {
          const prevItem = index > 0 ? navItems[index - 1] : null;
          const showCategory = item.category && (!prevItem || prevItem.category !== item.category);

          const isActive =
            location.pathname === item.path ||
            (item.path !== `/${role}` && location.pathname.startsWith(item.path))

          return (
            <div key={item.id} className={showCategory && index > 0 ? "mt-2 pt-5 border-t border-white/[0.08] flex flex-col" : "flex flex-col"}>
              {showCategory && !collapsed && (
                <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-widest text-indigo-300/70 mb-1 flex items-center gap-2">
                  {t(`nav.cat.${String(item.category).toLowerCase().replace(/[^a-z]+/g, '_')}`, String(item.category))}
                </div>
              )}
              {showCategory && collapsed && index > 0 && (
                <div className="mx-3 my-3 h-px bg-white/10" />
              )}
              <Link
                to={item.path}
              className={`
                group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium
                outline-none select-none transition-colors duration-150
                focus-visible:ring-2 focus-visible:ring-white/30
                ${isActive
                  ? `${theme.activeBg} text-white`
                  : `text-slate-400 ${theme.hoverBg} hover:text-slate-100`
                }
                ${collapsed ? 'justify-center px-3' : ''}
              `}
            >
              {/* Active bar */}
              <span 
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full ${theme.activeBar} transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0'}`} 
              />

              <Icon
                name={item.icon}
                size={19}
                className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${isActive ? 'text-white' : 'text-white/45 group-hover:text-white/80'}`}
              />

              {!collapsed && (
                <span className="truncate leading-tight">{t(`nav.item.${item.id}`, item.label)}</span>
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
                  {t(`nav.item.${item.id}`, item.label)}
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
                </div>
              )}
            </Link>
            </div>
          )
        })}
      </nav>

      {/* ── Footer ───────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[0.08] px-2 py-3 space-y-0.5">
        <Link
          to="/"
          className={`
            group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm
            text-slate-400 ${theme.hoverBg} hover:text-slate-100
            transition-all duration-150
            ${collapsed ? 'justify-center px-3' : ''}
          `}
        >
          <Home size={18} className="shrink-0 transition-transform group-hover:scale-105" />
          {!collapsed && <span>Home</span>}
          {collapsed && (
            <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              Home
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={onToggleCollapse}
          className={`
            flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm
            text-slate-400 ${theme.hoverBg} hover:text-slate-100
            transition-all duration-150
            ${collapsed ? 'justify-center px-3' : ''}
          `}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}
