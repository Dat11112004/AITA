import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { BookOpen, ArrowRight, LayoutGrid, FileText, Loader2 } from 'lucide-react'
import { APIError } from '@/components/common/ErrorState'

export function LecturerOverview() {
  const [stats, setStats] = useState<Record<string, string | number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([
      api.getClasses(),
      api.getAssignments({ limit: '5' })
    ])
      .then(([classesData, assignmentsData]) => {
        if (alive) {
          setStats({
            classes: classesData?.length || 0,
            assignments: assignmentsData?.length || 0
          })
        }
      })
      .catch(err => { if (alive) setError(err) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const cleanup = loadData()
    return cleanup
  }, [loadData])

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>
  if (error) return <APIError error={error} onRetry={loadData} />

  const statCards = [
    { id: 'classes', label: 'Lớp đang dạy', value: stats.classes ?? '—', icon: BookOpen },
    { id: 'assignments', label: 'Bài tập', value: stats.assignments ?? '—', icon: FileText },
  ]

  const shortcuts = [
    { to: '/lecturer/classes', icon: BookOpen, label: 'Quản lý Lớp học', desc: 'Xem danh sách và tiến độ', cls: 'bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20' },
    { to: '/lecturer/assignments', icon: FileText, label: 'Ngân hàng Bài tập', desc: 'Chỉnh sửa và giao bài', cls: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
  ]

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 items-center rounded-full bg-brand-100 px-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
              Cổng Giảng Viên
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Bảng Điều Khiển
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
            Quản lý tài nguyên giảng dạy và bài tập của bạn.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2">
        {statCards.map((s, i) => (
          <div 
            key={s.id} 
            className="animate-fade-in-up group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/70 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_-5px_rgba(6,81,237,0.15)] dark:bg-[#151821] dark:border-slate-800/80 dark:shadow-none dark:hover:border-brand-500/50" 
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-slate-50 opacity-50 transition-transform group-hover:scale-150 dark:bg-white/[0.02]" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{s.label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white">{s.value}</p>
                </div>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-slate-800/50 dark:group-hover:bg-brand-500/10 dark:group-hover:text-brand-400 transition-colors`}>
                <s.icon size={22} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 items-start">
        {/* Sidebar Grid: Tools & Helpers */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions / Shortcuts */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151821]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <LayoutGrid size={16} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lối tắt công cụ</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shortcuts.map((s) => (
                <Link key={s.to} to={s.to} className="group relative flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-[#1a1f2e] dark:hover:border-slate-600 transition-all">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.cls}`}>
                    <s.icon size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{s.label}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{s.desc}</p>
                  </div>
                  <div className="absolute right-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 dark:text-slate-600 transition-all">
                    <ArrowRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
