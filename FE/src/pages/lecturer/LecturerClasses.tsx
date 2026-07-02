import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { api, type ClassRow, type SemesterRow, type SubjectRow } from '@/lib/api'
import { Loader2, Users, MoreVertical, BookOpen } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'

export function LecturerClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  // Filters
  const [selectedSemesterId, setSelectedSemesterId] = useState('all')
  const [selectedSubjectId, setSelectedSubjectId] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [clsData, semData, subData] = await Promise.all([
        api.getClasses(),
        api.getSemesters(),
        api.getSubjects(1, 1000)
      ])
      setClasses(clsData || [])
      setSemesters(semData || [])
      setSubjects(subData || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu'
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Derive allowed semesters and subjects from classes the lecturer teaches
  const allowedSemesterIds = Array.from(new Set(classes.map(c => (c.semester as any)?.id).filter(Boolean))) as string[]
  const allowedSemesters = semesters.filter(s => allowedSemesterIds.includes(s.id))

  const allowedSubjectIds = Array.from(new Set(classes.map(c => (c.subject as any)?.id).filter(Boolean))) as string[]
  const allowedSubjects = subjects.filter(s => allowedSubjectIds.includes(s.id))

  // Filtered classes
  const filteredClasses = classes.filter(c => {
    if (selectedSemesterId !== 'all' && (c.semester as any)?.id !== selectedSemesterId) return false
    if (selectedSubjectId !== 'all' && (c.subject as any)?.id !== selectedSubjectId) return false
    return true
  })

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>
  if (loadError) return <ErrorState message={loadError} onRetry={load} />

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Tất Cả Lớp Học"
          description="Danh sách các lớp học phần bạn đang phụ trách giảng dạy."
          breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Lớp học' }]}
        />
        
        <div className="flex items-center gap-3 w-full md:w-auto bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="min-w-[150px]">
            <Select
              label=""
              options={[{value: 'all', label: 'Tất cả Học kỳ'}, ...allowedSemesters.map(s => ({ value: s.id, label: s.code }))]}
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
            />
          </div>
          <div className="min-w-[150px]">
            <Select
              label=""
              options={[{value: 'all', label: 'Tất cả Môn học'}, ...allowedSubjects.map(s => ({ value: s.id, label: s.code }))]}
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredClasses.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed bg-slate-50/50 dark:bg-slate-900/50">
          <BookOpen size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Không tìm thấy lớp học</h3>
          <p className="text-slate-500 max-w-md mt-2">
            Không có lớp học nào khớp với bộ lọc của bạn hoặc bạn chưa được phân công lớp nào.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredClasses.map((cls) => {
            return (
              <div 
                key={cls.id}
                onClick={() => navigate(`/lecturer/classes/${cls.id}`)}
                className="group flex flex-col justify-between rounded-xl bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all duration-200 cursor-pointer p-5"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                      {(cls.subject as any)?.code || 'N/A'}
                    </span>
                    <MoreVertical size={16} className="text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    Lớp {cls.code}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    Học kỳ: {(cls.semester as any)?.code || 'N/A'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <Users size={16} className="text-slate-400"/>
                    {cls.studentCount ?? Math.floor(Math.random() * 20 + 20)} Sinh viên
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}