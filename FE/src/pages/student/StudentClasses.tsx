import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { BookOpen, Users, ChevronRight, Loader2, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'

import { SemesterSelector, type SemesterOption } from '@/components/ui/SemesterSelector'

type ClassInfo = {
  id: string
  classCode: string
  subject: { id: string; code: string; name: string }
  lecturers: { id: string; name: string }[]
}

export function StudentClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSemester, setSelectedSemester] = useState<SemesterOption>('SUMMER2026')

  const loadData = useCallback(() => {
    let alive = true
    setLoading(true)
    api.getStudentDashboard()
      .then(res => {
        if (alive && res?.enrolledClasses) {
          setClasses(res.enrolledClasses)
        }
      })
      .catch(err => console.error("Failed to fetch dashboard classes", err))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const cleanup = loadData()
    return cleanup
  }, [loadData])

  // Group classes by subject (only if current semester or mock semester filtering)
  const isCurrentSemester = selectedSemester === 'SUMMER2026'

  const subjectsMap = new Map<string, { subject: ClassInfo['subject'], classes: ClassInfo[] }>()
  if (isCurrentSemester) {
    for (const cls of classes) {
      if (cls.subject) {
        if (!subjectsMap.has(cls.subject.id)) {
          subjectsMap.set(cls.subject.id, { subject: cls.subject, classes: [] })
        }
        subjectsMap.get(cls.subject.id)!.classes.push(cls)
      }
    }
  }
  const groupedSubjects = Array.from(subjectsMap.values())

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Lớp học của tôi"
          description={`Danh sách các lớp học bạn đang tham gia trong mùa học ${selectedSemester}.`}
          breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Lớp học' }]}
        />
        <SemesterSelector
          selectedSemester={selectedSemester}
          onChange={setSelectedSemester}
          className="self-start sm:self-auto shrink-0"
        />
      </div>

      <div className="space-y-6">
        {groupedSubjects.length === 0 ? (
          <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 shadow-sm">
            Bạn chưa đăng ký lớp học nào trong mùa học này.
          </div>
        ) : (
          groupedSubjects.map(group => (
            <div key={group.subject.id} className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BookOpen size={20} className="text-brand-600 dark:text-brand-400" /> 
                    {group.subject.code} - {group.subject.name}
                  </h3>
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                    {selectedSemester}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 w-max">
                  {group.classes.length} Lớp học
                </div>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.classes.map(cls => (
                  <div 
                    key={cls.id}
                    onClick={() => navigate(`/student/classes/${cls.id}`)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-brand-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 w-10 h-10 rounded-xl flex items-center justify-center bg-brand-100 dark:bg-brand-900/30 shrink-0 border border-brand-200 dark:border-brand-800/50">
                        <Calendar className="text-brand-600 dark:text-brand-400" size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg group-hover:text-brand-600 transition-colors">
                          Mã lớp: {cls.classCode}
                        </h4>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                            <Users size={14}/> Giảng viên: {cls.lecturers?.[0]?.name || 'Chưa phân công'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 flex shrink-0 items-center text-sm font-bold text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transform duration-200">
                      Xem chi tiết lớp <ChevronRight size={16} className="ml-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
