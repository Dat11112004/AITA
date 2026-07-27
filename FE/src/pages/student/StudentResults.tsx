import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { BookOpen, Users, GraduationCap, ChevronRight, Send, Loader2, Award, CheckCircle2, Clock, BarChart3, Sparkles, FolderOpen, X, MessageSquare, UserCheck, Bot } from 'lucide-react'
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
  isSubmitted: boolean
  isPublished: boolean
  assignmentId: string | null
  submissionId: string | null
  aiFeedback: string | null
  instructorFeedback: string | null
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
  const [activeGradeModal, setActiveGradeModal] = useState<GradeItem | null>(null)
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
        const clsAssignments = assignmentList.filter(a => a.classId === cls.id || a.class === cls.code)
        
        const grades: GradeItem[] = clsAssignments.map(a => {
          const sub = submissionList.find(s => s.assignmentId === a.id) as any
          const isPublished = sub?.reviewStatus === 'PUBLISHED' || sub?.isPublished === true
          const validScore = isPublished ? (sub?.finalScore ?? sub?.totalScore ?? sub?.score ?? sub?.Score) : null
          
          return {
            type: a.type === 'Exam' ? 'FE' : 'ASS',
            title: a.title,
            weight: a.type === 'Exam' ? '50%' : '10%',
            score: validScore !== undefined && validScore !== null ? Number(validScore) : null,
            isSubmitted: !!sub,
            isPublished: isPublished,
            assignmentId: a.id,
            submissionId: sub?.id || null,
            aiFeedback: isPublished ? (sub?.aiFeedback ? String(sub.aiFeedback) : null) : null,
            instructorFeedback: isPublished ? (sub?.instructorFeedback ? String(sub.instructorFeedback) : null) : null
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

  // Compute Subject Stats & Rating
  const activeStats = useMemo(() => {
    if (!activeSubject || activeSubject.grades.length === 0) {
      return { avgScore: '—', totalGrades: 0, publishedCount: 0, submittedCount: 0, totalCount: 0, rating: null }
    }
    
    let totalScore = 0
    let publishedCount = 0
    let submittedCount = 0
    const totalCount = activeSubject.grades.length

    activeSubject.grades.forEach(g => {
      if (g.isSubmitted) submittedCount++
      if (g.isPublished && g.score !== null) {
        totalScore += Number(g.score)
        publishedCount++
      }
    })

    const avg = publishedCount > 0 ? (totalScore / publishedCount).toFixed(1) : '—'
    let rating = null
    if (avg !== '—') {
      const num = Number(avg)
      if (num >= 8.5) rating = { text: 'Xuất sắc', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400' }
      else if (num >= 7.0) rating = { text: 'Khá Giỏi', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400' }
      else if (num >= 5.0) rating = { text: 'Trung bình', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400' }
      else rating = { text: 'Cần cố gắng', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400' }
    }

    return { avgScore: avg, totalGrades: totalCount, publishedCount, submittedCount, totalCount, rating }
  }, [activeSubject])

  const handleSendAppeal = async (assignmentId: string) => {
    if (!appealText.trim() || !assignmentId) return
    setIsSending(true)
    try {
      const subs = await api.getSubmissions({ assignmentId })
      const sub = subs?.[0]
      if (sub) {
        await api.submitFeedback(sub.id, appealText)
        alert('Đã gửi ý kiến phản hồi tới Giảng viên thành công!')
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar: Subjects List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Danh sách môn học</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{subjects.length} Môn</span>
          </div>

          <div className="space-y-2">
            {subjects.length === 0 && (
              <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-500">
                Bạn chưa được xếp vào lớp nào.
              </div>
            )}
            {subjects.map(sub => {
              const isSelected = selectedSubjectId === sub.id
              let total = 0, count = 0
              sub.grades.forEach(g => {
                if (g.isPublished && g.score !== null) { total += Number(g.score); count++ }
              })
              const avg = count > 0 ? (total / count).toFixed(1) : null

              return (
                <div 
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubjectId(sub.id)
                    setActiveGradeModal(null)
                  }}
                  className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    isSelected 
                    ? 'bg-brand-50 border-brand-300 dark:bg-brand-900/30 dark:border-brand-700 shadow-md ring-2 ring-brand-500/10' 
                    : 'bg-white border-slate-200/80 dark:bg-[#151821] dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected 
                        ? 'bg-brand-600 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-brand-50 group-hover:text-brand-600'
                    }`}>
                      {sub.code.slice(0, 3)}
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {sub.code}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1">{sub.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {avg !== null ? (
                      <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        {avg}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">—</span>
                    )}
                    <ChevronRight size={16} className={`transition-transform duration-200 ${isSelected ? 'text-brand-500 translate-x-0.5' : 'text-slate-300 group-hover:text-slate-400'}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Content: Details & Grades */}
        <div className="lg:col-span-3 space-y-6">
          {activeSubject ? (
            <>
              {/* Header Card */}
              <div className="relative overflow-hidden bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 border border-brand-500/20">
                        {activeSubject.code}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Đang diễn ra
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {activeSubject.name}
                    </h2>
                    <div className="text-xs text-slate-500 mt-2 flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5"><BookOpen size={14} className="text-brand-500"/> Lớp: <strong className="text-slate-700 dark:text-slate-200 font-bold">{activeSubject.classCode}</strong></span>
                      <span className="flex items-center gap-1.5"><Users size={14} className="text-brand-500"/> Giảng viên: <strong className="text-slate-700 dark:text-slate-200 font-bold">{activeSubject.teacher}</strong></span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/student/subjects', { state: { expand: activeSubject.id } })}
                    className="self-start md:self-center border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                  >
                    <FolderOpen size={14} className="mr-1.5 text-brand-600"/> Xem Bài tập Môn học
                  </Button>
                </div>

                {/* 3 Executive Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Điểm trung bình môn</span>
                      <BarChart3 size={16} className="text-brand-500" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {activeStats.avgScore}
                      </span>
                      {activeStats.avgScore !== '—' && <span className="text-xs text-slate-400 font-semibold">/ 10</span>}
                    </div>
                    {activeStats.rating && (
                      <span className={`inline-block mt-2 px-2.5 py-0.5 text-[10px] font-black rounded-md border ${activeStats.rating.color}`}>
                        {activeStats.rating.text}
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Tiến độ nộp bài</span>
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {activeStats.submittedCount}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">/ {activeStats.totalCount} bài</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${activeStats.totalCount > 0 ? (activeStats.submittedCount / activeStats.totalCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Trạng thái công bố</span>
                      <Award size={16} className="text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {activeStats.publishedCount}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">/ {activeStats.totalCount} bài đã công bố</span>
                    </div>
                    <span className="inline-block mt-2 text-[11px] font-semibold text-slate-500">
                      {activeStats.publishedCount === activeStats.totalCount && activeStats.totalCount > 0
                        ? '🟢 Đã công bố tất cả điểm'
                        : '⏳ Đang chờ GV hoàn tất chấm'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gradebook Matrix */}
              <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                      <GraduationCap size={18} className="text-brand-600"/> Bảng điểm môn học
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Nhấn vào bài tập để xem nhận xét từ AI & Giảng viên</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{activeSubject.grades.length} Bài tập</span>
                </div>

                <div className="p-4 sm:p-6">
                  {activeSubject.grades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-gradient-to-br from-slate-50 to-brand-50/20 dark:from-slate-900/40 dark:to-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-inner mb-4 animate-bounce">
                        <Award size={32} />
                      </div>
                      <h4 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                        Chưa có dữ liệu bài tập
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
                        Giảng viên hiện chưa công bố điểm hoặc chưa giao bài tập nào cho môn học này. Vui lòng quay lại sau khi giảng viên hoàn tất chấm bài!
                      </p>
                      <Button 
                        onClick={() => navigate('/student/subjects', { state: { expand: activeSubject.id } })}
                        className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md px-5 py-2 text-xs font-bold"
                      >
                        Chuyển tới Môn học & Bài tập <ChevronRight size={16} className="ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {activeSubject.grades.map((grade, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setActiveGradeModal(grade)}
                          className="group border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-[#151821] hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-black text-xs shrink-0 border ${
                              grade.type === 'FE' 
                                ? 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400' 
                                : 'bg-brand-500/10 text-brand-600 border-brand-200 dark:bg-brand-500/20 dark:text-brand-400'
                            }`}>
                              <span>{grade.type}</span>
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-2">
                                {grade.title}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">Trọng số: <strong className="text-slate-700 dark:text-slate-300">{grade.weight}</strong></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                            <div className="text-right">
                              {grade.isPublished && grade.score !== null ? (
                                <div className="flex items-center gap-2">
                                  <div className="text-2xl font-black text-brand-600 dark:text-brand-400 tracking-tight">
                                    {Number(grade.score).toLocaleString('vi-VN')}
                                  </div>
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Đã công bố
                                  </span>
                                </div>
                              ) : grade.isSubmitted ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                  <Clock size={12} /> Đã nộp (Chờ công bố điểm)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                  Chưa nộp bài
                                </span>
                              )}
                            </div>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveGradeModal(grade)
                              }}
                              className="bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/30 dark:border-brand-700 dark:text-brand-300 group-hover:bg-brand-600 group-hover:text-white transition-all text-xs font-bold rounded-xl"
                            >
                              <Sparkles size={14} className="mr-1"/> AI & GV Feedback
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-white dark:bg-[#151821] rounded-2xl border border-slate-200 dark:border-slate-800">
              Vui lòng chọn một môn học từ danh sách bên trái để xem kết quả học tập.
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: Detail AI & Lecturer Feedback ─────────────────────── */}
      {activeGradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-brand-500/10 text-brand-600 border border-brand-500/20">
                    {activeGradeModal.type}
                  </span>
                  <span className="text-xs text-slate-500">Trọng số: {activeGradeModal.weight}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {activeGradeModal.title}
                </h3>
              </div>
              <button 
                onClick={() => setActiveGradeModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Score & Status Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-brand-950 text-white flex items-center justify-between shadow-md">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm số bài làm</div>
                {activeGradeModal.isPublished && activeGradeModal.score !== null ? (
                  <div className="text-3xl font-black text-white mt-1">{activeGradeModal.score} <span className="text-sm font-normal text-slate-400">/ 10</span></div>
                ) : activeGradeModal.isSubmitted ? (
                  <div className="text-sm font-bold text-amber-400 mt-1">⏳ Giảng viên đang xem xét / Chờ công bố</div>
                ) : (
                  <div className="text-sm font-bold text-slate-400 mt-1">❌ Chưa nộp bài</div>
                )}
              </div>

              {activeGradeModal.assignmentId && (
                <Button 
                  onClick={() => {
                    const assignId = activeGradeModal.assignmentId
                    setActiveGradeModal(null)
                    navigate(`/student/assignments/${assignId}`)
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl"
                >
                  Xem bài nộp đầy đủ
                </Button>
              )}
            </div>

            {/* AI Feedback Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <Bot size={16} /> Nhận xét từ AI Autograder
              </h4>
              <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeGradeModal.aiFeedback ? (
                  <p className="whitespace-pre-line">{activeGradeModal.aiFeedback}</p>
                ) : activeGradeModal.isPublished ? (
                  <p className="text-slate-400 italic">Bài tập này chưa có nhận xét chi tiết từ AI.</p>
                ) : (
                  <p className="text-slate-400 italic">Kết quả và nhận xét AI sẽ tự động hiển thị sau khi giảng viên công bố.</p>
                )}
              </div>
            </div>

            {/* Lecturer Feedback Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <UserCheck size={16} /> Nhận xét trực tiếp từ Giảng viên
              </h4>
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeGradeModal.instructorFeedback ? (
                  <p className="whitespace-pre-line">{activeGradeModal.instructorFeedback}</p>
                ) : (
                  <p className="text-slate-400 italic">Giảng viên chưa để lại lời nhắn hoặc ghi chú riêng cho bài làm này.</p>
                )}
              </div>
            </div>

            {/* Student Appeal / Question Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare size={16} /> Ý kiến / Thắc mắc gửi tới Giảng viên
              </h4>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input 
                    placeholder="Nhập ý kiến thắc mắc về điểm số hoặc nhận xét..."
                    value={appealText}
                    onChange={(e) => setAppealText(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleSendAppeal(activeGradeModal.assignmentId as string)} 
                  disabled={isSending || !appealText.trim()}
                  className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs mb-0.5"
                >
                  {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send size={13} className="mr-1"/>} Gửi
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
