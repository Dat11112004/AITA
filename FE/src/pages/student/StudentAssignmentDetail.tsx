import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, gradingApi, type AssignmentRow, type SubmissionRow, getStoredItem, AUTH_STORAGE_KEYS } from '@/lib/api'
import { FileText, UploadCloud, CheckCircle2, AlertCircle, Send, Loader2, Download, ChevronRight, Clock, Calendar, Check, Minus, Paperclip, Award, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { FormattedText } from '@/components/ui/FormattedText'

export function StudentAssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
  const [submission, setSubmission] = useState<SubmissionRow | null>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [content] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const [appealText, setAppealText] = useState('')
  const [showAppeal, setShowAppeal] = useState(false)

  const loadData = useCallback(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    
    Promise.all([
      gradingApi.getAssignment(id).catch(() => api.getAssignment(id)),
      api.getSubmissions({ assignmentId: id }).then(res => res?.[0] || null) // Mock: assume first is current user's
    ])
    .then(([a, s]) => {
      if (alive) {
        console.log('API getAssignment result:', a)
        console.log('API getSubmissions result:', s)
        setAssignment(a as any)
        setSubmission(s as SubmissionRow)
      }
    })
    .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [id])

  useEffect(() => {
    const cleanup = loadData()
    return cleanup
  }, [loadData])

  const handleSubmit = async () => {
    if (!id || (!file && !content)) return
    setIsSubmitting(true)
    try {
      const res = await api.submitAssignment(file, content, id)
      // Update state with newly submitted data
      setSubmission({
        id: res.submissionId,
        assignmentId: id,
        studentId: 'user', // We might not have full user context here, but reloading data works too
        student: 'Sinh viên',
        content: content || file?.name || '',
        score: null,
        aiScore: null,
        status: res.status || 'Pending',
        aiFeedback: null,
        submittedAt: new Date().toISOString()
      } as unknown as SubmissionRow)
      
      setToast({ message: 'Nộp bài thành công!', type: 'success' })
      // Optionally reload from server to get accurate info
      loadData()
    } catch (e: any) {
      setToast({ message: e.message || 'Lỗi nộp bài', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendAppeal = async () => {
    if (!appealText.trim() || !submission) return
    setIsSubmitting(true)
    try {
      await api.submitFeedback(submission.id, appealText)
      setToast({ message: 'Đã gửi ý kiến phản hồi tới Giảng viên thành công!', type: 'success' })
      setShowAppeal(false)
      setAppealText('')
      // Optionally reload the submission to show the updated feedback state if the backend returns it
    } catch (e: any) {
      setToast({ message: e.message || 'Lỗi gửi phản hồi', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="flex p-20 justify-center text-brand-600">Đang tải dữ liệu...</div>
  if (!assignment) return <div className="p-20 text-center text-red-500 font-bold">Không tìm thấy bài tập</div>

  const dueDate = assignment.due || (assignment as any).stats?.dueDate || (assignment as any).metadata?.dueDate
  const timeRemaining = dueDate ? new Date(dueDate).getTime() - new Date().getTime() : 0;
  const isPastDue = timeRemaining < 0;
  const isNearDeadline = !isPastDue && timeRemaining < 24 * 60 * 60 * 1000;
  const isSubmitted = !!submission;
  const displayScore = submission ? ((submission as any).finalScore ?? submission.score ?? (submission as any).totalScore) : null;
  const isGraded = submission && (submission.status === 'Graded' || (submission as any).gradingStatus === 'Graded' || displayScore != null);
  const gradedDate = submission ? ((submission as any).gradedAt || (submission as any).reviewedAt) : null;
  const isLocked = isPastDue && !isSubmitted;
  const fullContent = (assignment as any)?.metadata?.content || (assignment as any)?.content || (assignment as any)?.blueprint?.assignment?.description || (assignment as any)?.details;
  const rubricsList = assignment.rubrics || (assignment as any).rubric?.rules || [];

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in duration-500 relative">
      {toast && (
        <div className="fixed top-24 right-8 z-[100] animate-toast-in">
          <div className={`rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border p-4 flex items-center gap-3 min-w-[320px] bg-white dark:bg-slate-800 ${toast.type === 'error' ? 'border-red-100 dark:border-red-900' : 'border-emerald-100 dark:border-emerald-900'}`}>
            <div className={`shrink-0 p-1.5 rounded-full ${toast.type === 'error' ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'}`}>
              {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <p className={`font-semibold text-sm ${toast.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 max-w-[1600px] mx-auto">
        
        {/* Left Column: Assignment Context (Like EduNext) */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="mb-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <Link to="/student" className="hover:text-slate-600 cursor-pointer transition-colors">Home</Link>
              <ChevronRight size={14} />
              <Link to="/student/subjects" className="hover:text-slate-600 cursor-pointer transition-colors">Môn học</Link>
              <ChevronRight size={14} />
              <Link to="/student/subjects" state={{ expand: assignment.subjectId }} className="hover:text-slate-600 cursor-pointer transition-colors">{assignment.subjectName ? assignment.subjectName.split(' - ')[0] : 'CSD201'}</Link>
              <ChevronRight size={14} />
              <span className="font-medium text-slate-700 dark:text-slate-300">{assignment.title}</span>
            </div>

            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{assignment.title}</h1>
              </div>
              
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-md font-medium text-sm border border-blue-100 dark:border-blue-800">
                  <FileText size={14} />
                  {assignment.type === 'Exam' ? 'Đề thi' : 'Bài tập'}
                </div>
                
                {assignment.due && isNearDeadline && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-md font-medium text-sm border border-amber-100 dark:border-amber-800">
                    <Clock size={14} />
                    Sắp đến hạn
                  </div>
                )}

                {assignment.due && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-sm border ${
                    isPastDue || isNearDeadline
                      ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-800' 
                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                  }`}>
                    <Calendar size={14} />
                    Hạn nộp: {new Date(assignment.due).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Card: Chi tiết bài tập (Đề bài chi tiết) */}
          <Card className="bg-white dark:bg-[#151821] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" /> Chi tiết bài tập
              </h2>
            </div>
            <div className="p-5 text-[15px] text-slate-700 dark:text-slate-300">
              {fullContent ? (
                <div 
                  className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 leading-relaxed text-sm prose prose-sm prose-slate dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: fullContent }}
                />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {assignment.description || (assignment as any)?.metadata?.description || 'Giảng viên chưa cung cấp mô tả chi tiết cho bài tập này.'}
                </p>
              )}
            </div>
          </Card>
              
          {/* Card: File đính kèm */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <Card className="bg-white dark:bg-[#151821] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="px-5 py-2 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Paperclip size={18} className="text-blue-600" /> File đính kèm
                </h2>
              </div>
              <div className="px-5 py-2">
                <div className="flex flex-col gap-2">
                  {assignment.attachments.map(att => (
                    <a 
                      key={att.id}
                      href={`${(import.meta as any).env.VITE_API_URL || '/api'}/assignments/attachments/${att.id}/download?token=${getStoredItem(AUTH_STORAGE_KEYS.token)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-brand-50 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-blue-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-brand-600 transition-colors flex-1">{att.fileName}</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-brand-600 group-hover:border-brand-200 shadow-sm transition-all">
                        <Download size={14} />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Card: Rubric Section */}
          {rubricsList && rubricsList.length > 0 && (
            <Card className="bg-white dark:bg-[#151821] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="px-5 py-2 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Award size={18} className="text-blue-600" /> Tiêu chí chấm điểm (Rubric)
                </h2>
              </div>
              <div className="px-5 py-2">
                <div className="space-y-4">
                  {rubricsList.map((rule: any, index: number) => (
                    <div key={rule.id} className="rounded-lg border border-blue-50 dark:border-blue-900/30 overflow-hidden bg-blue-50/50 dark:bg-blue-900/10">
                      <div className="p-4 flex justify-between items-start gap-4">
                        <div className="flex gap-3 flex-1">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm border border-blue-200 dark:border-blue-800">
                            {index + 1}
                          </div>
                          <div className="text-sm text-slate-800 dark:text-slate-200 block leading-relaxed mt-1">
                            <FormattedText text={rule.description || 'Tiêu chí'} />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md shrink-0 mt-0.5 border border-blue-100 dark:border-blue-800">
                          {rule.maxPoints}đ
                        </span>
                      </div>
                      
                      {rule.scoringStrategy === 'StdInOutProbe' && rule.requiredEvidence?.[0]?.stdInOutProbe?.testCases && (
                        <div className="px-4 pb-4">
                          <p className="text-xs font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider mb-2">I/O test cases</p>
                          <div className="flex flex-col gap-2">
                            {rule.requiredEvidence[0].stdInOutProbe.testCases.map((tc: any, i: number) => (
                              <div key={i} className="bg-white dark:bg-[#151821] rounded border border-blue-100 dark:border-blue-800/50 p-3 text-xs font-mono grid grid-cols-2 gap-4 shadow-sm">
                                <div>
                                  <span className="text-slate-400 font-semibold mb-1 block">In:</span>
                                  <span className="dark:text-slate-300 text-slate-700 whitespace-pre-wrap">{tc.input}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-semibold mb-1 block">Out:</span>
                                  <span className="dark:text-emerald-400/80 text-emerald-600 whitespace-pre-wrap">{tc.expectedOutput}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {rule.criteria && rule.criteria.length > 0 && (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                          {rule.criteria.map((c: any) => (
                            <li key={c.id} className="p-3 flex justify-between items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                              <FormattedText className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed" text={typeof c.description === 'string' ? c.description : JSON.stringify(c.description)} />
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-500 whitespace-nowrap pt-0.5">{c.maxPoints}đ</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Grading & Feedback Result */}
          {isGraded && displayScore != null && (
            <Card className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
              <div className="px-5 py-2 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" /> Kết quả & Nhận xét từ AI
                </h2>
              </div>
              
              <div className="px-5 py-2">
                {submission.aiFeedback ? (
                  <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/10 dark:to-blue-900/10 border border-indigo-100/50 dark:border-indigo-500/20 rounded-2xl p-6 shadow-sm mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-700/30">
                        <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Mentor Feedback</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Tổng hợp đánh giá & chiến lược phát triển</p>
                      </div>
                    </div>
                    <div className="prose prose-indigo dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:my-1 text-sm text-slate-700 dark:text-slate-300">
                      <ReactMarkdown>{submission.aiFeedback as string}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-center italic">
                      Không có nhận xét tự động.
                    </p>
                  </div>
                )}

                <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                  {!showAppeal ? (
                    <button onClick={() => setShowAppeal(true)} className="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline">
                      Bạn có thắc mắc về điểm số?
                    </button>
                  ) : (
                    <div className="text-left bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-2">
                      <h4 className="font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">Gửi khiếu nại / ý kiến tới giảng viên</h4>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Input 
                            placeholder="Nhập nội dung thắc mắc..." 
                            value={appealText}
                            onChange={(e) => setAppealText(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleSendAppeal} className="bg-brand-600 hover:bg-brand-700 text-white mb-1">
                          <Send size={16} className="mr-2"/> Gửi
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

        </div>

        {/* Right Column: Submission Form & Info */}
        <div className="space-y-6 lg:pt-[88px]">
          <Card className="bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Bài làm của bạn
              </h3>
            </div>
            <div className="px-5 py-2 space-y-4">
              {isSubmitted ? (
                <div className="border-2 border-dashed border-emerald-200 rounded-xl p-5 text-center dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-emerald-800 dark:text-emerald-500">Đã nộp thành công</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-600/80 mt-1 mb-3">
                    Lúc: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                  </p>

                  {submission?.zipFileUrl && (
                    <a 
                      href={`${(import.meta as any).env.VITE_API_URL || '/api'}/submissions/${submission.id}/download?token=${getStoredItem(AUTH_STORAGE_KEYS.token)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white hover:bg-emerald-50 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/50 transition-colors group text-left"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200 truncate">
                          {submission.zipFileUrl.includes('?filename=') ? decodeURIComponent(submission.zipFileUrl.split('?filename=')[1]) : (submission.zipFileUrl.split('/').pop()?.split('?')[0] || 'File bài nộp')}
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-700 transition-all shrink-0 ml-2">
                        <Download size={14} />
                      </div>
                    </a>
                  )}
                </div>
              ) : isLocked ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center dark:bg-red-900/10 dark:border-red-900/30">
                  <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                  <p className="font-bold text-red-800 dark:text-red-500">Đã hết hạn nộp bài</p>
                  <p className="text-sm text-red-600 dark:text-red-600/80 mt-1">Hệ thống đã khóa tính năng nộp bài.</p>
                </div>
              ) : (
                <>
                  <div className="border-2 border-dashed border-blue-200 dark:border-blue-800/50 rounded-xl p-5 flex flex-col items-center justify-center text-slate-500 bg-white hover:bg-blue-50/50 dark:bg-slate-900/50 transition-colors relative cursor-pointer group">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <UploadCloud size={28} className="mb-2 text-blue-500 group-hover:text-blue-600 transition-colors" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Kéo & thả file vào đây</p>
                    <p className="text-xs text-slate-400 mt-0.5 mb-3">hoặc chọn file từ máy</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Hỗ trợ: PDF, DOCX, ZIP (Tối đa 10MB)</p>
                  </div>
                  
                  {file && (
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-center justify-between mb-4 mt-4">
                      <span className="text-sm font-medium truncate pr-4 text-slate-700 dark:text-slate-300">{file.name}</span>
                      <button onClick={() => setFile(null)} className="text-red-500 text-sm font-bold hover:underline shrink-0">Xóa</button>
                    </div>
                  )}

                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium mt-2 rounded-lg py-2.5 h-auto"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !file}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Send size={16} className="mr-2" />}
                    Nộp bài
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Thông tin bài tập Card */}
          <Card className="bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Thông tin bài tập
              </h3>
            </div>
            <div className="px-5 py-2 space-y-4 text-sm">
               <div className="flex justify-between items-start gap-4">
                 <span className="text-slate-500 shrink-0 mt-0.5">Môn học</span>
                 <span className="font-medium text-slate-700 dark:text-slate-300 text-right">{assignment.subjectName || 'CSD201 - Mobile Application Dev'}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-500">Giảng viên</span>
                 <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0">
                     <img src={assignment.lecturerAvatar || "https://i.pravatar.cc/100?img=5"} alt="Lecturer" className="w-full h-full object-cover" />
                   </div>
                   <span className="font-medium text-slate-700 dark:text-slate-300">{assignment.lecturer || 'Giảng viên'}</span>
                 </div>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-500">Hạn nộp</span>
                 <span className="font-medium text-red-600">{assignment.due ? new Date(assignment.due).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-500">Trạng thái</span>
                 <span className={`font-medium ${isSubmitted ? 'text-emerald-500' : 'text-amber-500'}`}>{isSubmitted ? 'Đã nộp' : 'Chưa nộp'}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-500">Điểm</span>
                 {displayScore != null ? (
                   <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${Number(displayScore) >= 8 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : Number(displayScore) >= 5 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                     {Number(displayScore).toLocaleString('vi-VN')}
                   </span>
                 ) : (
                   <span className="font-medium text-slate-700 dark:text-slate-300">—</span>
                 )}
               </div>
            </div>
          </Card>

          {/* Tiến trình Card */}
          <Card className="bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Tiến trình
              </h3>
            </div>
            <div className="px-5 py-2 relative">
               <div className="absolute left-[30px] top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-700 -ml-px z-0"></div>
               
               <div className="space-y-6 relative z-10">
                 <div className="flex items-start gap-4">
                   <div className="w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-white dark:border-[#151821] flex items-center justify-center shrink-0 mt-0.5">
                     <Check size={12} className="text-white" />
                   </div>
                   <div className="flex-1 flex justify-between">
                     <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Đã giao</span>
                     <span className="text-xs text-slate-400">{assignment.createdAt ? new Date(assignment.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
                   </div>
                 </div>

                 <div className="flex items-start gap-4">
                   <div className={`w-5 h-5 rounded-full border-[3px] border-white dark:border-[#151821] flex items-center justify-center shrink-0 mt-0.5 ${isSubmitted ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                     {isSubmitted ? <Check size={12} className="text-white" /> : <Minus size={12} className="text-white" />}
                   </div>
                   <div className="flex-1 flex justify-between">
                     <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{isSubmitted ? 'Đã nộp' : 'Chưa nộp'}</span>
                     <span className="text-xs text-slate-400">{isSubmitted && submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
                   </div>
                 </div>

                 <div className="flex items-start gap-4">
                   <div className={`w-5 h-5 rounded-full border-[3px] border-white dark:border-[#151821] flex items-center justify-center shrink-0 mt-0.5 ${isGraded ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {isGraded && <Check size={12} className="text-white" />}
                   </div>
                   <div className="flex-1 flex justify-between">
                     <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{isGraded ? 'Đã chấm' : 'Chưa chấm'}</span>
                     <span className="text-xs text-slate-400">{isGraded && gradedDate ? new Date(gradedDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
                   </div>
                </div>
              </div>
            </div>
          </Card>

          {isGraded && submission && (
            <Button
              onClick={() => navigate(`/student/grading/result/${submission.id}`)}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white shadow-sm font-medium rounded-lg py-3 h-auto transition-all"
            >
              <Award size={18} className="mr-2" />
              Xem chi tiết chấm Rubric
            </Button>
          )}

        </div>
      </div>
    </div>
  )
}
