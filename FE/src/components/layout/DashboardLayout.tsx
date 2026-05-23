import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import type { NavItem, UserRole } from '@/types'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardTopbar } from './DashboardTopbar'

interface DashboardLayoutProps {
  navItems: NavItem[]
  role: UserRole
  roleLabel: string
  portalTitle: string
}

export function DashboardLayout({ navItems, role, roleLabel, portalTitle }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardSidebar
        navItems={navItems}
        role={role}
        roleLabel={roleLabel}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className={`transition-[margin] ${collapsed ? 'ml-[72px]' : 'ml-64'}`}>
        <DashboardTopbar title={portalTitle} sidebarCollapsed={collapsed} />
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
