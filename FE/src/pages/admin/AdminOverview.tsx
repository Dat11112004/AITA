import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api, type ActivityLog } from '@/lib/api'
import { Server } from 'lucide-react'

export function AdminOverview() {
  const [stats, setStats] = useState<Record<string, string | number>>({})
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [health, setHealth] = useState<Record<string, { status: string }>>({})

  useEffect(() => {
    api.getStatsOverview().then(setStats).catch(console.error)
    api.getActivity().then(setLogs).catch(console.error)
    api.getSystemHealth().then(setHealth).catch(console.error)
  }, [])

  const statCards = [
    { id: 'users', label: 'Tổng người dùng', value: stats.users ?? '—' },
    { id: 'classes', label: 'Lớp học', value: stats.classes ?? '—' },
    { id: 'ai-jobs', label: 'Yêu cầu AI (24h)', value: stats['ai-jobs'] ?? '—' },
    { id: 'uptime', label: 'Uptime hệ thống', value: stats.uptime ?? '—' },
  ]

  return (
    <div>
      <PageHeader
        title="Tổng quan hệ thống"
        description="Quản trị viên theo dõi người dùng, lớp học, module AI và sức khỏe hệ thống."
        actions={
          <>
            <Link to="/admin/users">
              <Button variant="outline" size="sm">Quản lý người dùng</Button>
            </Link>
            <Link to="/admin/settings">
              <Button size="sm">Cài đặt</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.id} {...s} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Hoạt động gần đây" />
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có nhật ký</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map((log) => (
                <li key={log.id} className="flex justify-between border-b border-slate-100 py-2">
                  <span>
                    <strong>{log.user}</strong> — {log.action}
                  </span>
                  <span className="text-slate-400">{new Date(log.createdAt).toLocaleString('vi')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Trạng thái dịch vụ" />
          <ul className="space-y-2 text-sm">
            {Object.entries(health).map(([key, val]) => (
              <li key={key} className="flex items-center gap-2">
                <Server size={16} className="text-brand-600" />
                <span className="capitalize">{key}</span>
                <span className={`ml-auto font-medium ${val.status === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {val.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
