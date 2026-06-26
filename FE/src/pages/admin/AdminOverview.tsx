import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api, type ActivityLog } from '@/lib/api'
import { type StatMetric } from '@/types'
import { Server, Users, BookOpen, Brain, Activity, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { APIError } from '@/components/common/ErrorState'

export function AdminOverview() {
  const [stats, setStats] = useState<Record<string, string | number>>({})
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [health, setHealth] = useState<Record<string, { status: string }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.getStatsOverview().then(setStats),
      api.getActivity().then(setLogs),
      api.getSystemHealth().then(setHealth)
    ])
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>
  if (error) return <APIError error={error} onRetry={loadData} />

  const statCards: StatMetric[] = [
    { id: 'users', label: 'Tổng người dùng', value: stats.users ?? '—', icon: Users },
    { id: 'classes', label: 'Lớp hoạt động', value: stats.classes ?? '—', icon: BookOpen },
    { id: 'ai-jobs', label: 'Yêu cầu AI (24h)', value: stats['ai-jobs'] ?? '—', icon: Brain },
    { id: 'uptime', label: 'Uptime hệ thống', value: stats.uptime ?? '—', icon: Server },
  ]

  const quickActions = [
    { label: 'Người dùng', path: '/admin/users', icon: Users, cls: 'text-brand-700 bg-brand-50 border-brand-100 dark:text-brand-400 dark:bg-brand-500/10 dark:border-brand-500/20' },
    { label: 'Lớp học', path: '/admin/classes', icon: BookOpen, cls: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20' },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Tổng quan hệ thống"
          description="Theo dõi người dùng, trạng thái dịch vụ và module AI."
          breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Tổng quan' }]}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s, i) => (
          <div key={s.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* Quick access */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
          Truy cập nhanh
        </p>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {quickActions.map((a) => (
            <Link
              key={a.path} to={a.path}
              className={`group flex items-center gap-3 rounded-2xl border ${a.cls} bg-white dark:bg-[#161b27] p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.cls}`}>
                <a.icon size={17} />
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{a.label}</span>
              <ArrowRight size={13} className="ml-auto shrink-0 text-slate-300 group-hover:text-slate-500 dark:text-slate-700 dark:group-hover:text-slate-400 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Activity + Health */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Activity */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
            <Activity size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hoạt động gần đây</span>
          </div>
          <div className="p-4">
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-600">Chưa có nhật ký hoạt động.</p>
            ) : logs.slice(0, 6).map((log) => (
              <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{log.user}</span>
                    <span className="mx-1 text-slate-300 dark:text-slate-700">·</span>
                    {log.action}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-mono text-slate-400 dark:text-slate-600">
                  {new Date(log.createdAt).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Health */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
            <Server size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Trạng thái dịch vụ</span>
            <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>
          <div className="p-4">
            {Object.keys(health).length === 0 ? (
              <div className="space-y-3 py-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-28 skeleton" /><div className="h-5 w-16 skeleton rounded-full" />
                  </div>
                ))}
              </div>
            ) : Object.entries(health).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${val.status === 'up' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                    <Server size={14} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{key}</span>
                </div>
                <div className="flex items-center gap-2">
                  {val.status === 'up' ? <CheckCircle size={14} className="text-emerald-500" /> : <AlertCircle size={14} className="text-red-500" />}
                  <Badge variant={val.status === 'up' ? 'success' : 'danger'} dot size="sm">
                    {val.status === 'up' ? 'Online' : 'Lỗi'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
