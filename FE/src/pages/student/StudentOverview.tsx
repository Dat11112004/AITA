import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { BookOpen, ArrowRight, ClipboardList } from 'lucide-react'

export function StudentOverview() {
  const [stats, setStats] = useState<Record<string, string | number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      api.getClasses(),
      api.getAssignments({ limit: '5' })
    ]).then(([classesData, assignmentsData]) => {
      if (alive) {
        setStats({
          classes: classesData?.length || 0,
          assignments: assignmentsData?.length || 0
        })
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
    { id: 'assignments', label: 'Bài tập', value: stats.assignments ?? '—', icon: ClipboardList },
  ]

  const shortcuts = [
    { to: '/student/classes', icon: BookOpen, label: 'Lớp học', cls: 'bg-brand-50 text-brand-700 border-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20' },
    { to: '/student/assignments', icon: ClipboardList, label: 'Bài tập', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
  ]

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Bảng học tập"
          description="Theo dõi bài tập và lớp học của bạn."
          breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Tổng quan' }]}
        />
        <Link to="/student/assignments">
          <Button variant="primary" size="sm" className="gap-2 shrink-0">
            Xem bài tập <ArrowRight size={14} />
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        {statCards.map((s, i) => (
          <div key={s.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Shortcuts */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
            <BookOpen size={15} className="text-slate-400" />
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
        </Card>
      </div>
    </div>
  )
}
