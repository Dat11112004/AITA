import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api, type SubmissionRow } from '@/lib/api'
import { Sparkles, CheckSquare, Users, BookOpen, Clock, ArrowRight, Layers, LayoutGrid } from 'lucide-react'

export function LecturerOverview() {
  const [stats, setStats] = useState<Record<string, string | number>>({})
  const [recent, setRecent] = useState<SubmissionRow[]>([])

  useEffect(() => {
    api.getStatsOverview().then(setStats).catch(console.error)
    api.getRecentSubmissions(5).then(setRecent).catch(console.error)
  }, [])

  const statCards = [
    { id: 'classes', label: 'Lớp đang dạy', value: stats.classes ?? '—', icon: BookOpen },
    { id: 'pending', label: 'Bài chờ chấm', value: stats.pending ?? '—', icon: Clock, trend: 'down' as const, trendLabel: 'Cần chấm' },
    { id: 'ai-review', label: 'AI chờ duyệt', value: stats['ai-review'] ?? '—', icon: Sparkles },
    { id: 'students', label: 'Tổng sinh viên', value: stats.students ?? '—', icon: Users },
  ]

  const shortcuts = [
    { to: '/lecturer/classes', icon: BookOpen, label: 'Lớp học', cls: 'bg-brand-50 text-brand-700 border-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20' },
    { to: '/lecturer/teamwork', icon: Users, label: 'Đánh giá nhóm', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    { to: '/lecturer/notifications', icon: Clock, label: 'Thông báo', cls: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Bảng điều khiển"
          description="Quản lý lớp học, bài tập và theo dõi tiến độ sinh viên."
          breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Tổng quan' }]}
        />
        <div className="flex gap-2 shrink-0">
          <Link to="/lecturer/ai-generate">
            <Button variant="accent" size="sm" className="gap-2">
              <Sparkles size={14} /> Tạo bài AI
            </Button>
          </Link>
          <Link to="/lecturer/grading">
            <Button variant="outline" size="sm" className="gap-2">
              <CheckSquare size={14} /> Chấm bài
            </Button>
          </Link>
        </div>
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
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Recent submissions */}
        <Card padding="none" className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
            <Layers size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Bài nộp gần đây</span>
            <Link to="/lecturer/grading" className="ml-auto">
              <Button variant="ghost" size="sm" className="gap-1">Xem tất cả <ArrowRight size={12} /></Button>
            </Link>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {recent.length === 0 ? (
              <div className="py-12 text-center">
                <Layers size={28} className="mx-auto mb-3 text-slate-200 dark:text-slate-800" strokeWidth={1.5} />
                <p className="text-sm text-slate-400 dark:text-slate-600">Chưa có bài nộp mới.</p>
              </div>
            ) : recent.map((s) => (
              <div key={s.id} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-[11px] font-bold text-white">
                  {s.student?.slice(0, 2).toUpperCase() ?? 'SV'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {s.student}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 truncate mt-0.5">{s.assignment}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {s.language && <Badge variant="neutral" size="sm">{s.language}</Badge>}
                  <p className="text-xs text-slate-400 dark:text-slate-600 whitespace-nowrap font-mono">
                    {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('vi') : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Shortcuts */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
            <LayoutGrid size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Lối tắt</span>
          </div>
          <div className="p-4 space-y-2">
            {shortcuts.map((s) => (
              <Link key={s.to} to={s.to}
                className={`group flex items-center gap-3 rounded-xl border ${s.cls} bg-white dark:bg-[#161b27] px-4 py-3 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.cls}`}>
                  <s.icon size={15} />
                </div>
                <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{s.label}</span>
                <ArrowRight size={13} className="shrink-0 text-slate-300 group-hover:text-slate-500 dark:text-slate-700 dark:group-hover:text-slate-400 transition-colors" />
              </Link>
            ))}
          </div>

          {/* AI CTA */}
          <div className="px-4 pb-4">
            <Link to="/lecturer/ai-generate" className="block">
              <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-4 text-white">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                    <Sparkles size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-none">Tạo bài bằng AI</p>
                    <p className="mt-1 text-xs text-orange-200/80 leading-snug">Sinh đề cá nhân hóa cho lớp</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <span className="text-xs font-bold text-white/80 flex items-center gap-1">
                    Thử ngay <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
