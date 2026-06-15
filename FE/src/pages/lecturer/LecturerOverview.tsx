import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api, type SubmissionRow } from '@/lib/api'
import { Sparkles, CheckSquare, Users, BookOpen, Clock, ArrowRight, Layers, LayoutGrid, FileText, BarChart4 } from 'lucide-react'

export function LecturerOverview() {
  const [stats, setStats] = useState<Record<string, string | number>>({})
  const [recent, setRecent] = useState<SubmissionRow[]>([])

  useEffect(() => {
    api.getStatsOverview().then(setStats).catch(console.error)
    api.getRecentSubmissions(5).then(setRecent).catch(console.error)
  }, [])

  const statCards = [
    { id: 'classes', label: 'Lớp đang dạy', value: stats.classes ?? '—', icon: BookOpen },
    { id: 'pending', label: 'Bài chờ chấm', value: stats.pending ?? '—', icon: Clock, trend: 'down' as const, trendLabel: 'Cần chấm ưu tiên' },
    { id: 'ai-review', label: 'AI chờ duyệt', value: stats['ai-review'] ?? '—', icon: Sparkles },
    { id: 'students', label: 'Tổng sinh viên', value: stats.students ?? '—', icon: Users },
  ]

  const shortcuts = [
    { to: '/lecturer/classes', icon: BookOpen, label: 'Quản lý Lớp học', desc: 'Xem danh sách và tiến độ', cls: 'bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20' },
    { to: '/lecturer/assignments', icon: FileText, label: 'Ngân hàng Bài tập', desc: 'Chỉnh sửa và giao bài', cls: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
    { to: '/lecturer/teamwork', icon: Users, label: 'Đánh giá Nhóm', desc: 'Chấm điểm dự án', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    { to: '/lecturer/reports', icon: BarChart4, label: 'Báo cáo Thống kê', desc: 'Hiệu suất sinh viên', cls: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' },
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
            Quản lý tài nguyên giảng dạy, đánh giá tiến độ sinh viên và tối ưu hóa thời gian với sự hỗ trợ của AI.
          </p>
        </div>
        
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link to="/lecturer/ai-generate">
            <Button className="h-10 gap-2 bg-gradient-to-r from-brand-600 to-brand-500 font-bold hover:shadow-lg hover:shadow-brand-500/25 transition-all text-white">
              <Sparkles size={16} /> Tạo bài bằng AI
            </Button>
          </Link>
          <Link to="/lecturer/grading">
            <Button variant="outline" className="h-10 gap-2 border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white">
              <CheckSquare size={16} /> Chấm Bài Nhanh
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
            {s.trend && (
              <div className="relative mt-4 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 w-fit px-2 py-1 rounded-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
                </span>
                {s.trendLabel}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3 items-start">
        {/* Main Content: Recent Submissions */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-[#151821] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                  <Layers size={16} strokeWidth={2.5} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bài nộp mới nhất</h2>
              </div>
              <Link to="/lecturer/grading">
                <Button variant="ghost" size="sm" className="hidden sm:flex text-sm font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
                  Xem tất cả <ArrowRight size={16} className="ml-1.5" />
                </Button>
              </Link>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-slate-50 p-4 dark:bg-slate-800/50">
                    <CheckSquare size={32} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="mt-4 font-semibold text-slate-900 dark:text-slate-200">Không có bài nộp nào</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tất cả bài tập đã được chấm xong.</p>
                </div>
              ) : recent.map((s) => (
                <div key={s.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-brand-500 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                      {s.student?.substring(0, 2).toUpperCase() ?? 'SV'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {s.student}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {s.assignment}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end ml-14 sm:ml-0">
                    {s.language && <Badge variant="neutral" className="rounded-md font-mono text-[10px] uppercase font-bold tracking-wider">{s.language}</Badge>}
                    <span className="text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                      {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('vi') : '—'}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 hidden sm:inline-flex">
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-800/20 sm:hidden">
              <Button variant="outline" className="w-full font-bold">Xem tất cả</Button>
            </div>
          </div>
        </div>

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
            <div className="grid grid-cols-1 gap-3">
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

          {/* AI Banner Card */}
          <Link to="/lecturer/ai-generate" className="block transform transition-transform hover:-translate-y-1">
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 shadow-xl">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-500/30 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/30 blur-2xl" />
              
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-inner">
                  <Sparkles size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">Trợ lý AI AITA</h3>
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed font-medium">
                    Tự động tạo bộ đề cương, bài tập và rubric chấm điểm chuẩn hóa cá nhân cho lớp học của bạn.
                  </p>
                </div>
              </div>
              <div className="relative mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-bold text-slate-400">Tiết kiệm đến 40% thời gian</span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-brand-400">
                  Thử ngay <ArrowRight size={16} />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
