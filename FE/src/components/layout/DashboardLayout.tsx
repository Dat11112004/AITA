import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import type { NavItem, UserRole } from '@/types'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardTopbar } from './DashboardTopbar'

interface Props {
  navItems: NavItem[]
  role: UserRole
  roleLabel: string
  portalTitle: string
}

export function DashboardLayout({ navItems, role, roleLabel, portalTitle }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-bg-light-orange dark:bg-[#0f1117] transition-colors duration-300">
      <DashboardSidebar
        navItems={navItems}
        role={role}
        roleLabel={roleLabel}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />
      <div className={`transition-[margin] duration-300 ease-in-out ${collapsed ? 'ml-[68px]' : 'ml-64'}`}>
        <DashboardTopbar title={portalTitle} sidebarCollapsed={collapsed} />
        <main className="min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8 animate-fade-in-up">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
