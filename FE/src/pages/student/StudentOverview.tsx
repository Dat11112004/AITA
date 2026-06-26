import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api, type NotificationRow } from '@/lib/api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { Bell, Clock, BookOpen, CheckCircle, ArrowRight, TrendingUp, MessageSquare, History, Users } from 'lucide-react'

export function StudentOverview() {
  const [stats, setStats] = useState<Record<string, string | number>>({})
  const [announcements, setAnnouncements] = useState<NotificationRow[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      api.getStatsOverview(),
      api.getNotifications({ limit: '3', type: 'info' })
    ]).then(([statsData, notifsData]) => {
      if (alive) {
        setStats(statsData)
        setAnnouncements(notifsData)
      }
    }).catch((e) => {
      if (alive) setError(e.message)
    }).finally(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const statCards = [
    { id: 'classes', label: 'Lớp đang học', value: stats.classes ?? '—', icon: BookOpen },
    { id: 'due', label: 'Sắp đến hạn', value: stats.due ?? '—', icon: Clock, trend: 'down' as const, trendLabel: 'Cần nộp' },
    { id: 'graded', label: 'Đã có điểm', value: stats.graded ?? '—', icon: CheckCircle },
    { id: 'feedback', label: 'Phản hồi AI', value: stats.feedback ?? '—', icon: Bell },
  ]

  const shortcuts = [
    { to: '/student/learning', icon: TrendingUp, label: 'Lộ trình học', cls: 'bg-brand-50 text-brand-700 border-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20' },
    { to: '/student/feedback', icon: MessageSquare, label: 'Phản hồi AI', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    { to: '/student/discussion', icon: Users, label: 'Thảo luận', cls: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' },
    { to: '/student/history', icon: History, label: 'Lịch sử nộp', cls: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
  ]

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Bảng học tập"
          description="Theo dõi bài tập, tiến độ và phản hồi từ AI."
          breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Tổng quan' }]}
        />
        <Link to="/student/assignments">
          <Button variant="primary" size="sm" className="gap-2 shrink-0">
            Xem bài tập <ArrowRight size={14} />
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s, i) => (
          <div key={s.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Notifications */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
            <Bell size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Thông báo mới</span>
            <Link to="/student/notifications" className="ml-auto">
              <Button variant="ghost" size="sm">Xem tất cả</Button>
            </Link>
          </div>
          <div className="p-4 space-y-2.5">
            {announcements.length === 0 ? (
              <div className="py-8 text-center">
                <Bell size={28} className="mx-auto mb-2 text-slate-200 dark:text-slate-800" strokeWidth={1.5} />
                <p className="text-sm text-slate-400 dark:text-slate-600">Không có thông báo mới.</p>
              </div>
            ) : announcements.map((n) => (
              <div key={n.id} className="flex gap-3 items-start rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-3 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${n.type === 'urgent' ? 'bg-red-50 text-red-500 dark:bg-red-500/10' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'}`}>
                  <Bell size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">{n.title}</p>
                    {n.type === 'urgent' && <Badge variant="danger" size="sm">Khẩn</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                  <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-600">
                    {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Shortcuts */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
            <TrendingUp size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Lối tắt học tập</span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {shortcuts.map((s) => (
              <Link key={s.to} to={s.to}
                className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl border ${s.cls} bg-white dark:bg-[#161b27] p-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${s.cls}`}>
                  <s.icon size={20} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight">{s.label}</span>
              </Link>
            ))}
          </div>

          {/* Progress bar */}
          <div className="px-4 pb-4">
            <Link to="/student/learning">
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e2535] p-4 hover:border-brand-200 dark:hover:border-brand-700/40 transition-colors group">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tiến độ học kỳ</p>
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">78%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-700" />
                </div>
                <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-600 flex items-center gap-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  Xem lộ trình <ArrowRight size={10} />
                </p>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
