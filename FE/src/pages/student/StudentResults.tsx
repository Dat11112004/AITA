import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { BookOpen, Users, GraduationCap, ChevronRight, FileText, Send, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

// Define the aggregated Subject/Class gradebook structure
type GradeItem = {
  type: string
  title: string
  weight: string
  score: number | null
  assignmentId: string | null
  feedback: string | null
}

type AggregatedSubject = {
  id: string
  code: string
  name: string
  classCode: string
  teacher: string
  grades: GradeItem[]
}

export function StudentResults() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<AggregatedSubject[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [showAppeal, setShowAppeal] = useState<string | null>(null) // Grade type string
  const [appealText, setAppealText] = useState('')
  const [isSending, setIsSending] = useState(false)

  const loadData = useCallback(() => {
    let alive = true
    setLoading(true)
    
    // Fetch classes the student is in, plus their assignments and submissions
    Promise.all([
      api.getClasses(),
      api.getAssignments(),
      api.getSubmissions()
    ]).then(([classesRes, assignmentsRes, submissionsRes]) => {
      if (!alive) return
      
      const classList = classesRes || []
      const assignmentList = assignmentsRes || []
      const submissionList = submissionsRes || []

      const aggregated: AggregatedSubject[] = classList.map(cls => {
        // Find assignments for this class
        const clsAssignments = assignmentList.filter(a => a.classId === cls.id || a.class === cls.code)
        
        // Build grades
        const grades: GradeItem[] = clsAssignments.map(a => {
          // Find submission for this assignment
          const sub = submissionList.find(s => s.assignmentId === a.id)
          
          return {
            type: a.type === 'Exam' ? 'FE' : 'ASS',
            title: a.title,
            weight: a.type === 'Exam' ? '50%' : '10%',
            score: sub?.score !== undefined ? sub.score : null,
            assignmentId: a.id,
            feedback: sub?.aiFeedback ? String(sub.aiFeedback) : null
          }
        })

        return {
          id: cls.id,
          code: typeof cls.subject === 'object' ? (cls.subject as any).code : (cls.subject || 'N/A'),
          name: typeof cls.subject === 'object' ? (cls.subject as any).name : 'Môn học',
          classCode: cls.code,
          teacher: cls.lecturers?.[0]?.fullName || cls.lecturers?.[0]?.name || 'Chưa phân công',
          grades
        }
      })

      setSubjects(aggregated)
      if (aggregated.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(aggregated[0].id)
      }
      setLoading(false)
    }).catch(err => {
      console.error("Failed to load grades", err)
      if (alive) setLoading(false)
    })
    
    return () => { alive = false }
  }, [selectedSubjectId])

  useEffect(() => {
    const cleanup = loadData()
    return cleanup
  }, [loadData])

  const activeSubject = subjects.find(s => s.id === selectedSubjectId)

  const handleSendAppeal = async (assignmentId: string) => {
    if (!appealText.trim() || !assignmentId) return
    setIsSending(true)
    try {
      // Find submission id to attach feedback
      const subs = await api.getSubmissions({ assignmentId })
      const sub = subs?.[0]
      if (sub) {
        await api.submitFeedback(sub.id, appealText)
        alert('Đã gửi ý kiến phản hồi tới Giảng viên thành công!')
        setShowAppeal(null)
        setAppealText('')
      } else {
        alert('Lỗi: Bạn chưa nộp bài hoặc chưa có kết quả để khiếu nại.')
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi phản hồi')
    } finally {
      setIsSending(false)
    }
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Kết quả Học tập"
        description="Xem điểm số, nhận xét từ giảng viên và AI feedback."
        breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Kết quả' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Left Sidebar: Subjects List */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 px-2">Danh sách môn học</h3>
          <div className="space-y-2">
            {subjects.length === 0 && <p className="text-sm text-slate-500 px-2">Bạn chưa được xếp vào lớp nào.</p>}
            {subjects.map(sub => (
              <div 
                key={sub.id}
                onClick={() => {
                  setSelectedSubjectId(sub.id)
                  setShowAppeal(null)
                }}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                  selectedSubjectId === sub.id 
                  ? 'bg-brand-50 border-brand-200 dark:bg-brand-900/30 dark:border-brand-800 shadow-sm' 
                  : 'bg-white border-slate-200 dark:bg-[#151821] dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700'
                }`}
              >
                <div>
                  <div className={`font-bold text-sm ${selectedSubjectId === sub.id ? 'text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {sub.code}
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-1">{sub.name}</div>
                </div>
                <ChevronRight size={16} className={selectedSubjectId === sub.id ? 'text-brand-500' : 'text-slate-300'} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Content: Details & Grades */}
        <div className="md:col-span-3 space-y-6">
          {activeSubject ? (
            <>
              {/* Class Info */}
              <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {activeSubject.code} - {activeSubject.name}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1"><BookOpen size={14}/> Lớp: <strong className="text-slate-700 dark:text-slate-300">{activeSubject.classCode}</strong></span>
                      <span className="flex items-center gap-1"><Users size={14}/> GV: <strong className="text-slate-700 dark:text-slate-300">{activeSubject.teacher}</strong></span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Gradebook Matrix */}
              <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <GraduationCap size={20} className="text-brand-600"/> Bảng điểm cá nhân
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid gap-4">
                    {activeSubject.grades.length === 0 && (
                      <div className="text-center p-8 text-slate-500">Giảng viên chưa chấm điểm hoặc chưa giao bài tập nào.</div>
                    )}
                    {activeSubject.grades.map((grade, idx) => (
                      <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        {/* Grade Row */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-white dark:bg-[#151821]">
                          <div className="flex items-center gap-3 mb-2 sm:mb-0">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                              {grade.type}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{grade.title}</div>
                              <div className="text-xs text-slate-500">Trọng số: {grade.weight}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              {grade.score !== null ? (
                                <div className="text-xl font-bold text-brand-600 dark:text-brand-400">
                                  {Number(grade.score).toLocaleString('vi-VN')}
                                </div>
                              ) : (
                                <div className="text-sm font-medium text-slate-400 italic">Chưa có điểm</div>
                              )}
                            </div>
                            {grade.assignmentId && (
                              <Button variant="outline" size="sm" onClick={() => navigate(`/student/assignments/${grade.assignmentId}`)} className="bg-white border-slate-200 text-slate-600">
                                Xem bài nộp
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* AI Feedback Section (Only if score exists and feedback exists) */}
                        {grade.score !== null && grade.feedback && (
                          <div className="bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/30 p-4">
                            <div className="flex items-start gap-3">
                              <FileText size={18} className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-amber-800 dark:text-amber-500 mb-1">AI Gợi ý cải thiện:</p>
                                <p className="text-sm text-amber-700 dark:text-amber-300/80 leading-relaxed">{grade.feedback}</p>
                                
                                <div className="mt-3">
                                  {showAppeal !== grade.assignmentId ? (
                                    <button 
                                      onClick={() => setShowAppeal(grade.assignmentId)}
                                      className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                                    >
                                      Ý kiến / Thắc mắc về điểm số?
                                    </button>
                                  ) : (
                                    <div className="mt-2 flex items-end gap-2 animate-in fade-in slide-in-from-top-2">
                                      <div className="flex-1">
                                        <Input 
                                          placeholder="Nhập phản hồi của bạn gửi tới giảng viên..." 
                                          value={appealText}
                                          onChange={(e) => setAppealText(e.target.value)}
                                        />
                                      </div>
                                      <Button size="sm" onClick={() => handleSendAppeal(grade.assignmentId as string)} disabled={isSending} className="bg-brand-600 hover:bg-brand-700 text-white mb-1">
                                        {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send size={14} className="mr-2"/>} Gửi
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">
              Vui lòng chọn một môn học để xem kết quả.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
