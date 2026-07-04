import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type AssignmentRow, type SubmissionRow } from '@/lib/api'
import { FileText, ArrowLeft, UploadCloud, CheckCircle2, AlertCircle, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'

export function StudentAssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
  const [submission, setSubmission] = useState<SubmissionRow | null>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  // AI Feedback Mock state
  const [aiFeedback] = useState('Bài làm khá tốt. Tuy nhiên cần chú ý tối ưu các vòng lặp để tránh time limit exceeded. Cấu trúc code sạch sẽ, rõ ràng.')
  const [appealText, setAppealText] = useState('')
  const [showAppeal, setShowAppeal] = useState(false)

  const loadData = useCallback(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    
    Promise.all([
      api.getAssignments().then(res => res?.find(a => a.id === id)),
      api.getSubmissions({ assignmentId: id }).then(res => res?.[0] || null) // Mock: assume first is current user's
    ])
    .then(([a, s]) => {
      if (alive) {
        setAssignment(a as AssignmentRow)
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
      await new Promise(r => setTimeout(r, 1000))
      // Mock successful submission
      setSubmission({
        id: 'new-sub',
        assignmentId: id,
        studentId: 'user',
        student: 'Sinh viên',
        content: content || file?.name || '',
        score: null,
        aiScore: null,
        status: 'SUBMITTED',
        aiFeedback: null,
        submittedAt: new Date().toISOString()
      })
      alert('Nộp bài thành công!')
    } catch (e: any) {
      alert(e.message || 'Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendAppeal = async () => {
    if (!appealText.trim() || !submission) return
    setIsSubmitting(true)
    try {
      await api.submitFeedback(submission.id, appealText)
      alert('Đã gửi ý kiến phản hồi tới Giảng viên thành công!')
      setShowAppeal(false)
      setAppealText('')
      // Optionally reload the submission to show the updated feedback state if the backend returns it
    } catch (e: any) {
      alert(e.message || 'Lỗi gửi phản hồi')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="flex p-20 justify-center text-brand-600">Đang tải dữ liệu...</div>
  if (!assignment) return <div className="p-20 text-center text-red-500 font-bold">Không tìm thấy bài tập</div>

  const isPastDue = assignment.due ? new Date(assignment.due) < new Date() : false;
  const isSubmitted = !!submission;
  const isLocked = isPastDue && !isSubmitted;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="mb-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/student/assignments')} className="bg-white border-slate-200 shadow-sm">
          <ArrowLeft size={16} className="mr-2" /> Quay lại
        </Button>
      </div>

      <PageHeader
        title={assignment.title}
        description={assignment.type === 'Exam' ? 'Đề thi' : 'Bài tập'}
      />

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Left Column: Assignment Context (Like EduNext) */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#151821] flex justify-between items-center">
              <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText size={18} className="text-brand-600" /> Đề bài
              </h2>
              {assignment.due && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${isPastDue ? 'bg-red-50 text-red-600 dark:bg-red-900/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'}`}>
                  Deadline: {new Date(assignment.due).toLocaleString()}
                </span>
              )}
            </div>
            <div className="p-6 prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
              <p className="whitespace-pre-wrap">{assignment.description || 'Giảng viên chưa cung cấp mô tả chi tiết cho bài tập này.'}</p>
            </div>
          </Card>

          {/* Grading & Feedback Result */}
          {submission && submission.score !== null && (
            <Card className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#151821] flex justify-between items-center">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" /> Kết quả chấm điểm
                </h2>
                <div className="font-black text-xl text-brand-600 dark:text-brand-400">
                  {submission.score}/10
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-1">Nhận xét từ AI:</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    {(submission.aiFeedback as string) || 'Không có nhận xét tự động.'}
                  </p>
                </div>

                {assignment.type === 'Assignment' && (
                  <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-5 relative overflow-hidden">
                      <div className="flex items-start gap-3 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                          ✨
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-amber-800 dark:text-amber-500 mb-2">AI Feedback (Gợi ý cải thiện)</h4>
                          <p className="text-sm text-amber-700 dark:text-amber-300/80 leading-relaxed">
                            {aiFeedback}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 text-right">
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

        {/* Right Column: Submission Form */}
        <div className="space-y-6">
          <Card className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#151821]">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                Bài làm của bạn
              </h3>
            </div>
            
            <div className="p-5 space-y-4">
              {isSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center dark:bg-emerald-900/10 dark:border-emerald-900/30">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-emerald-800 dark:text-emerald-500">Đã nộp thành công</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-600/80 mt-1">Lúc: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : ''}</p>
                </div>
              ) : isLocked ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center dark:bg-red-900/10 dark:border-red-900/30">
                  <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                  <p className="font-bold text-red-800 dark:text-red-500">Đã hết hạn nộp bài</p>
                  <p className="text-sm text-red-600 dark:text-red-600/80 mt-1">Hệ thống đã khóa tính năng nộp bài.</p>
                </div>
              ) : (
                <>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 transition-colors relative cursor-pointer group">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <UploadCloud size={32} className="mb-2 text-slate-400 group-hover:text-brand-500 transition-colors" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nhấp hoặc Kéo thả file</p>
                    <p className="text-xs mt-1">PDF, DOCX, ZIP (Max: 10MB)</p>
                  </div>
                  
                  {file && (
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium truncate pr-4 text-slate-700 dark:text-slate-300">{file.name}</span>
                      <button onClick={() => setFile(null)} className="text-red-500 text-sm font-bold hover:underline shrink-0">Xóa</button>
                    </div>
                  )}

                  <div className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest my-2">HOẶC</div>

                  <textarea 
                    className="w-full p-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none min-h-[100px]"
                    placeholder="Nhập câu trả lời trực tiếp..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />

                  <Button 
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white shadow-md font-bold mt-2"
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!file && !content)}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Send size={16} className="mr-2" />}
                    Nộp Bài
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
