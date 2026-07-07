import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type ClassRow, type AssignmentRow } from '@/lib/api'
import { BookOpen, ArrowRight, Loader2, Users, Bell, Clock, CheckCircle2, MoreVertical, Plus } from 'lucide-react'
import { APIError } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/Button'

export function LecturerOverview() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([
      api.getClasses(),
      api.getAssignments({ limit: '10' })
    ])
      .then(([classesData, assignmentsData]) => {
        if (alive) {
          setClasses(classesData || [])
          setAssignments(assignmentsData || [])
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

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>
  if (error) return <APIError error={error} onRetry={loadData} />

  // Group all classes by semester
  const groupedClasses: Record<string, { semesterName: string, classes: ClassRow[] }> = {}
  classes.forEach(cls => {
    const semId = (cls.semester as any)?.id || 'unknown'
    const semCode = (cls.semester as any)?.code || 'Kỳ khác'
    
    if (!groupedClasses[semId]) {
      groupedClasses[semId] = { semesterName: semCode, classes: [] }
    }
    groupedClasses[semId].classes.push(cls)
  })

  const groupedClassesArray = Object.values(groupedClasses).sort((a, b) => a.semesterName.localeCompare(b.semesterName))

  // Top 3 classes for the quick view is no longer used, we show grouped list
  
  // Mock 'To-Do' list based on assignments (Needs grading)
  const todoItems = assignments.slice(0, 4).map(a => ({
    id: a.id,
    title: a.title,
    classCode: 'N/A', // In a real app we'd join with class data or get it from API
    dueDate: a.due,
    needsGrading: Math.floor(Math.random() * 15) + 1, // Mock data
  }))

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Simple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-[#151821] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="mb-2 inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-900/30 px-2 py-1">
            <span className="text-xs font-bold text-brand-700 dark:text-brand-400">Năm học 2026 - Học kỳ 1</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Chào buổi sáng, Tiến sĩ!
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Bạn có {todoItems.reduce((acc, item) => acc + item.needsGrading, 0)} bài nộp đang chờ chấm điểm.
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={() => navigate('/lecturer/assignments/ai-generator')}>
            <Plus size={16} className="mr-2"/> Tạo Bài Tập AI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Active Classes (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="text-brand-600" /> Tổng quan Lớp học
            </h2>
            <Link to="/lecturer/classes" className="text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 group">
              Quản lý chi tiết <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
            </Link>
          </div>

          <div className="space-y-8">
            {groupedClassesArray.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500">
                Chưa có lớp học nào được phân công.
              </div>
            ) : (
              groupedClassesArray.map((group) => (
                <div key={group.semesterName} className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    Học kỳ {group.semesterName}
                    <span className="text-sm font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full ml-2">
                      {group.classes.length} lớp
                    </span>
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-5">
                    {group.classes.map((cls) => {
                      return (
                        <div 
                          key={cls.id}
                          onClick={() => navigate(`/lecturer/classes/${cls.id}`)}
                          className="group flex flex-col justify-between rounded-xl bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all cursor-pointer p-5"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                                {(cls.subject as any)?.code || 'N/A'}
                              </span>
                              <MoreVertical size={16} className="text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              Lớp {cls.code}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Học kỳ: {(cls.semester as any)?.code || 'N/A'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                              <Users size={16} />
                              {cls.studentCount ?? 0} Sinh viên
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
            
            {/* "Add New" placeholder card - optional on overview, but we can keep it at the very bottom */}
            <div className="group rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151821] flex flex-col items-center justify-center p-6 text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-all cursor-pointer min-h-[120px] max-w-sm mt-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-2 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/30 transition-all">
                <Plus size={20} />
              </div>
              <p className="font-medium text-sm">Mở lớp học phần mới</p>
            </div>
          </div>
        </div>

        {/* Right Column: To-Do / Needs Grading (1/3 width) */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" /> Cần Xử Lý
          </h2>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#151821] overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Bell size={16} className="text-brand-600" /> Chờ chấm điểm
              </h3>
              <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded dark:bg-slate-800 dark:text-slate-300">
                {todoItems.length} Mục
              </span>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {todoItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Tuyệt vời! Bạn không có bài nào cần chấm.
                </div>
              ) : (
                todoItems.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/lecturer/assignments/${item.id}/submissions`)}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2 pr-2">
                        {item.title}
                      </h4>
                      <div className="flex-shrink-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-medium text-xs px-2 py-0.5 rounded">
                        {item.needsGrading} bài
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><BookOpen size={12}/> Lớp N/A</span>
                      {item.dueDate && (
                        <span className="flex items-center gap-1"><Clock size={12}/> Hạn: {item.dueDate.split('T')[0]}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 text-center border-t border-slate-100 dark:border-slate-800">
              <Link to="/lecturer/assignments" className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400">
                Xem toàn bộ Bài tập
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
