import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import type { NavItem, UserRole } from '@/types'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardTopbar } from './DashboardTopbar'
import { DashboardFooter } from './DashboardFooter'

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
      <div className={`flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out ${collapsed ? 'ml-[68px]' : 'ml-64'}`}>
        <DashboardTopbar title={portalTitle} sidebarCollapsed={collapsed} />
        <main className="flex-1 min-h-[calc(100vh-130px)] px-4 sm:px-6 lg:px-8 pt-6 pb-8 animate-fade-in-up">
          <Outlet />
        </main>
        <DashboardFooter />
      </div>
    </div>
  )
}
