import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { BookOpen, Search, Loader2, ArrowRight, BookMarked, User } from 'lucide-react'
import { SemesterSelector, type SemesterOption } from '@/components/ui/SemesterSelector'

export function StudentCourses() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [selectedSemester, setSelectedSemester] = useState<SemesterOption>('SUMMER2026')

  const loadData = useCallback(() => {
    setLoading(true)
    api.getStudentDashboard()
      .then(data => {
        setDashboardData(data || {})
      })
      .catch(err => console.error("Failed to load student subjects:", err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const subjects = (dashboardData?.enrolledClasses || []).map((c: any) => ({
    id: c.subject?.id || c.id,
    classId: c.id,
    code: c.subject?.code || c.classCode,
    name: c.subject?.name || 'Môn học',
    teacher: c.lecturers?.[0]?.name || 'Chưa phân công',
  }))

  const filteredSubjects = subjects.filter((s: any) => {
    if (!search) return true
    const query = search.toLowerCase()
    return s.code?.toLowerCase().includes(query) || s.name?.toLowerCase().includes(query) || s.teacher?.toLowerCase().includes(query)
  })

  return (
    <div className="space-y-6 animate-fade-in-up pb-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-[#151821] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
              <BookOpen size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Các môn học hiện tại
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Danh sách các môn học bạn đang tham gia trong mùa học {selectedSemester}.
          </p>
        </div>
        <SemesterSelector
          selectedSemester={selectedSemester}
          onChange={setSelectedSemester}
          className="self-start md:self-auto shrink-0"
        />
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm môn học theo tên, mã môn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-sm"
          />
        </div>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-[#151821] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          Tổng số: <span className="text-brand-600 dark:text-brand-400 font-bold">{filteredSubjects.length}</span> môn học
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#151821]/50 text-center">
          <BookMarked size={40} className="text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Không tìm thấy môn học nào</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {search ? 'Thử thay đổi từ khóa tìm kiếm' : 'Bạn chưa đăng ký môn học nào trong học kỳ này.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((sub: any, idx: number) => (
            <div
              key={idx}
              onClick={() => navigate(`/student/classes/${sub.classId || sub.id}`)}
              className="group flex flex-col justify-between rounded-xl bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all cursor-pointer p-6"
            >
              <div>
                <span className="text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 px-2.5 py-1 rounded-md mb-3 inline-block">
                  {sub.code}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors text-base leading-snug">
                  {sub.name}
                </h3>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <User size={14} className="text-slate-400" /> GV: {sub.teacher}
                </span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-brand-600 dark:text-brand-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
