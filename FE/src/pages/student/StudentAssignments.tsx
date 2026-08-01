import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { api, type AssignmentRow } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { FileText, Loader2, Search, Clock, Calendar } from 'lucide-react'

export function StudentAssignments() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    let alive = true
    setLoading(true)
    api.getAssignments()
      .then(data => { if (alive) setAssignments(data || []) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const cleanup = loadData()
    return cleanup
  }, [loadData])

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Assignments & Exams"
          description="Assignments given to you by your lecturers."
          breadcrumbs={[{ label: 'Student', path: '/student' }, { label: 'Assignments' }]}
        />
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search assignments..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#151821] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {assignments.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center">
            <FileText size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
            <p>You do not have any assignments yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {assignments.map(a => {
              const isPastDue = a.due && new Date(a.due) < new Date()
              return (
                <div
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/student/assignments/${a.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 shrink-0">
                      {a.type === 'Exam' ? <Calendar className="text-indigo-600" size={20} /> : <FileText className="text-emerald-600" size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">{a.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{a.description || 'No description'}</p>
                      <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-2">
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm dark:bg-slate-900 dark:border-slate-700">
                          {a.type === 'Exam' ? 'Exam' : 'Assignment'}
                        </span>
                        {a.due ? (
                          <span className={`flex items-center gap-1 ${isPastDue ? 'text-red-500' : 'text-amber-600'}`}>
                            <Clock size={12} /> Due: {new Date(a.due).toLocaleString()}
                            {isPastDue && " (Overdue)"}
                          </span>
                        ) : (
                          <span className="text-slate-400">No due date</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex shrink-0">
                    <span className="text-sm font-bold text-brand-600 dark:text-brand-400 group-hover:underline">Start assignment</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
