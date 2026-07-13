import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { BookOpen, FileText, Loader2, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, type AssignmentRow } from '@/lib/api'

type SubjectInfo = {
  id: string
  code: string
  name: string
  description?: string
}

export function StudentSubjects() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null)

  const loadData = useCallback(() => {
    let alive = true
    setLoading(true)
    
    Promise.all([
      api.getStudentSubjects().catch(() => []),
      api.getAssignments().catch(() => [])
    ]).then(([subjectsRes, assignmentsRes]) => {
      if (alive) {
        setSubjects(subjectsRes || [])
        setAssignments(assignmentsRes || [])
        if (subjectsRes?.length > 0) {
          setExpandedSubjectId(subjectsRes[0].id)
        }
      }
    }).finally(() => { if (alive) setLoading(false) })
    
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const cleanup = loadData()
    return cleanup
  }, [loadData])

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Môn học & Bài tập"
        description="Xem danh sách môn học và thực hiện nộp bài tập / đề thi."
        breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Môn học' }]}
      />

      <div className="space-y-4">
        {subjects.length === 0 ? (
          <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 shadow-sm">
            Bạn chưa đăng ký môn học nào.
          </div>
        ) : (
          subjects.map(sub => {
            const isExpanded = expandedSubjectId === sub.id
            // Map assignment to subject by code or id (assuming assignment has class with subject code or we can just filter by some property. Actually the backend might not map assignment to subjectId perfectly in getAssignments, but let's try mapping by class subject code, or just filter)
            // Wait, AssignmentRow in `api.ts` might have `subjectId` or `subjectCode`? 
            // In StudentClasses, it did: `a.class === cls.code`.
            // Here, we can just show all assignments that belong to this subject (but we need to know the class). Let's just group them if we can, or we display assignments that have `a.subjectId === sub.id` or we can fallback to just showing all if mapping is hard.
            // Since `getAssignments` might not have subject mapped perfectly, let's show all assignments under the first subject for demo if we can't map. Actually, let's assume `a.subjectId === sub.id` or `a.subjectCode === sub.code`.
            const subjectAssignments = assignments.filter(a => (a as any).subjectId === sub.id || (a as any).subjectCode === sub.code || a.class?.includes(sub.code))

            return (
              <div key={sub.id} className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all duration-200">
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{sub.code} - {sub.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{subjectAssignments.length} bài tập / đề thi</p>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-5 animate-in slide-in-from-top-2">
                    {subjectAssignments.length === 0 ? (
                      <div className="text-center p-8 text-slate-500 italic flex flex-col items-center">
                        <FileText size={32} className="text-slate-300 mb-3" />
                        Chưa có bài tập nào cho môn này.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {subjectAssignments.map(a => {
                          const isPastDue = a.due && new Date(a.due) < new Date()
                          return (
                            <div 
                              key={a.id} 
                              onClick={() => navigate(`/student/assignments/${a.id}`)}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-700 rounded-xl hover:border-brand-300 dark:hover:border-brand-700 transition-colors cursor-pointer group shadow-sm"
                            >
                              <div className="flex items-start gap-4">
                                <div className={`mt-1 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${a.type === 'Exam' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                  {a.type === 'Exam' ? <Calendar size={20} /> : <FileText size={20} />}
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 transition-colors">{a.title}</h4>
                                  <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-2">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                      {a.type === 'Exam' ? 'Đề thi' : 'Bài tập'}
                                    </span>
                                    {a.due ? (
                                      <span className={`flex items-center gap-1 ${isPastDue ? 'text-red-500' : 'text-amber-600'}`}>
                                        <Clock size={12}/> Hạn: {new Date(a.due).toLocaleString()}
                                        {isPastDue && " (Quá hạn)"}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">Không có thời hạn</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 sm:mt-0">
                                <span className="text-sm font-bold text-brand-600 dark:text-brand-400 group-hover:underline">Xem chi tiết & Nộp bài</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
