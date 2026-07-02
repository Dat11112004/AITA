import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { api, type AssignmentRow, type SubmissionRow } from '@/lib/api'
import { ArrowLeft, Send, CheckCircle, Clock } from 'lucide-react'

export function StudentAssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
  const [submission, setSubmission] = useState<SubmissionRow | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAssignment(id)
      setAssignment(data)
      // Check if already submitted
      const subs = await api.getSubmissions({ assignmentId: id })
      if (subs && subs.length > 0) {
        setSubmission(subs[0])
        setContent(subs[0].content || '')
      }
    } catch (e: any) {
      setError(e.message || 'Lỗi tải chi tiết bài tập')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async () => {
    if (!id || (!content.trim() && !file)) return
    setSubmitting(true)
    try {
      const zipFileUrl = file ? `blob:upload/${file.name}` : undefined;
      await api.submitAssignment({ assignmentId: id, content, zipFileUrl })
      await load() // Reload to get updated submission status
    } catch (e: any) {
      alert(e.message || 'Lỗi khi nộp bài')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error || !assignment) return <ErrorState message={error || 'Không tìm thấy bài tập'} onRetry={load} />

  const isSubmitted = !!submission
  const isPastDeadline = assignment.due ? new Date(assignment.due) < new Date() : false

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/student/assignments')} className="shrink-0 p-2">
          <ArrowLeft size={16} />
        </Button>
        <PageHeader title={assignment.title} breadcrumbs={[{ label: 'Bài tập', path: '/student/assignments' }, { label: 'Chi tiết' }]} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Nội dung bài tập</h3>
            <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
              <p>{assignment.description || 'Chưa có mô tả chi tiết cho bài tập này.'}</p>
            </div>
            
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">Bài làm của bạn</h3>
              {isSubmitted ? (
                <div className="space-y-4">
                  {submission.zipFileUrl && (
                    <div className="p-3 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 rounded border border-brand-200 dark:border-brand-800 flex items-center">
                      <span className="font-medium mr-2">File đính kèm:</span> {submission.zipFileUrl.replace('blob:upload/', '')}
                    </div>
                  )}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {submission.content || 'Không có nội dung text'}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Upload File (Optional)</label>
                    <input 
                      type="file" 
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                    />
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Nhập nội dung bài làm của bạn hoặc dán code vào đây..."
                    className="w-full min-h-[200px] p-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none transition-shadow font-mono text-sm"
                  />
                </div>
              )}
            </div>

            {!isSubmitted && (
              <div className="mt-4 flex flex-col items-end gap-2">
                {isPastDeadline && (
                  <p className="text-sm font-medium text-red-500">Đã hết hạn nộp bài. Bạn không thể nộp bài tập này nữa.</p>
                )}
                <Button onClick={handleSubmit} disabled={submitting || (!content.trim() && !file) || isPastDeadline} className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-6">
                  {submitting ? 'Đang nộp...' : <><Send size={16} className="mr-2"/> Nộp bài ngay</>}
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Thông tin chung</h4>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Loại bài</span>
                <span className="font-medium">{assignment.type}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Môn học / Lớp</span>
                <span className="font-medium">{assignment.class || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Hạn nộp</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">{assignment.due?.slice(0, 10) || 'Không giới hạn'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Trạng thái</span>
                {isSubmitted ? (
                  <Badge variant="neutral" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1 border-0"><CheckCircle size={12}/> Đã nộp</Badge>
                ) : (
                  <Badge variant="neutral" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1 border-0"><Clock size={12}/> Chưa nộp</Badge>
                )}
              </div>
            </div>
          </Card>

          {isSubmitted && submission?.aiScore != null && (
            <Card className="p-5 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/50 shadow-sm">
              <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2">Đánh giá từ AI</h4>
              <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-2">
                {submission.aiScore}/100
              </div>
              <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80">
                AI đã chấm điểm sơ bộ bài làm của bạn. Giảng viên sẽ xem xét và công bố điểm chính thức sau.
              </p>
            </Card>
          )}
          
          {isSubmitted && submission?.score != null && (
            <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/50 shadow-sm">
              <h4 className="font-bold text-emerald-900 dark:text-emerald-300 mb-2">Điểm chính thức</h4>
              <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-2">
                {submission.score}/10
              </div>
              
              {/* Feedback Section */}
              <div className="mt-6 pt-4 border-t border-emerald-100 dark:border-emerald-800/50">
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">Ý kiến / Khiếu nại điểm</h4>
                {submission.studentFeedback ? (
                  <div className="text-sm p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <p className="font-medium text-xs text-slate-400 mb-1">Bạn đã gửi:</p>
                    {submission.studentFeedback}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea 
                      id="feedback-input"
                      className="w-full text-sm p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder="Nếu bạn có thắc mắc về điểm số, hãy nhập vào đây..."
                      rows={3}
                    />
                    <Button 
                      size="sm" 
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white"
                      onClick={async () => {
                        const el = document.getElementById('feedback-input') as HTMLTextAreaElement;
                        if (!el.value.trim()) return;
                        try {
                          await api.submitFeedback(submission.id, el.value);
                          alert('Đã gửi ý kiến thành công!');
                          await load();
                        } catch(e: any) {
                          alert(e.message || 'Lỗi gửi ý kiến');
                        }
                      }}
                    >
                      Gửi ý kiến
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
