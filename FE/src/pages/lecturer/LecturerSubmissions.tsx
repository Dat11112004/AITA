import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { api, type AssignmentRow, type SubmissionRow } from '@/lib/api'
import { ArrowLeft, CheckCircle, Clock, Save, X, Activity } from 'lucide-react'

export function LecturerSubmissions() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Grading Modal State
  const [gradingSub, setGradingSub] = useState<SubmissionRow | null>(null)
  const [score, setScore] = useState<number | ''>('')
  const [feedback, setFeedback] = useState('')
  const [isGrading, setIsGrading] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [assigData, subsData] = await Promise.all([
        api.getAssignment(id),
        api.getSubmissions({ assignmentId: id })
      ])
      setAssignment(assigData)
      setSubmissions(subsData || [])
    } catch (e: any) {
      setError(e.message || 'Lỗi tải danh sách bài nộp')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const openGradeModal = (sub: SubmissionRow) => {
    setGradingSub(sub)
    setScore(sub.score ?? '')
    setFeedback(typeof sub.aiFeedback === 'string' ? sub.aiFeedback : '')
  }

  const handleGrade = async () => {
    if (!gradingSub || score === '') return
    setIsGrading(true)
    try {
      await api.gradeSubmission(gradingSub.id, {
        score: Number(score),
        feedback,
      })
      setGradingSub(null)
      load() // Reload list
    } catch (error: any) {
      alert(error.message || 'Chấm điểm thất bại')
    } finally {
      setIsGrading(false)
    }
  }

  const handleStartSession = async () => {
    if (!id) return
    try {
      await api.startGradingSession(id)
      alert('Đã kích hoạt phiên chấm điểm AI thành công!')
      load()
    } catch (e: any) {
      alert(e.message || 'Kích hoạt phiên chấm điểm thất bại')
    }
  }

  if (loading) return <LoadingSpinner />
  if (error || !assignment) return <ErrorState message={error || 'Không tìm thấy bài tập'} onRetry={load} />

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/lecturer/assignments')} className="shrink-0 p-2">
          <ArrowLeft size={16} />
        </Button>
        <PageHeader 
          title={`Bài nộp: ${assignment.title}`} 
          breadcrumbs={[{ label: 'Bài tập', path: '/lecturer/assignments' }, { label: 'Bài nộp' }]} 
          actions={
            <Button size="sm" onClick={handleStartSession} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Activity size={16} />
              Bật AI Chấm điểm
            </Button>
          }
        />
      </div>

      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <CardHeader title={`Danh sách bài nộp (${submissions.length})`} />
        </div>

        <div className="p-2 overflow-x-auto custom-scrollbar">
          <DataTable
            columns={[
              {
                key: 'student',
                header: 'Sinh viên',
                render: (r) => (
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{(r as SubmissionRow).student}</p>
                    <p className="text-xs text-slate-500 font-mono">{(r as SubmissionRow).studentId}</p>
                  </div>
                )
              },
              {
                key: 'submittedAt',
                header: 'Thời gian nộp',
                render: (r) => <span className="text-sm">{(r as SubmissionRow).submittedAt?.replace('T', ' ')?.slice(0, 16) || '—'}</span>
              },
              {
                key: 'aiScore',
                header: 'AI Điểm',
                render: (r) => (
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {(r as SubmissionRow).aiScore != null ? `${(r as SubmissionRow).aiScore}/100` : '—'}
                  </span>
                )
              },
              {
                key: 'score',
                header: 'Điểm chính thức',
                render: (r) => (
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-lg">
                    {(r as SubmissionRow).score != null ? `${(r as SubmissionRow).score}` : '—'}
                  </span>
                )
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: (r) => {
                  const s = (r as SubmissionRow).status
                  return s === 'graded' ? (
                    <Badge variant="success" className="flex w-max items-center gap-1"><CheckCircle size={12}/> Đã chấm</Badge>
                  ) : (
                    <Badge variant="warning" className="flex w-max items-center gap-1"><Clock size={12}/> Chờ chấm</Badge>
                  )
                }
              },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <div className="flex justify-end gap-2 pr-2">
                    <Button size="sm" variant="outline" onClick={() => openGradeModal(r as SubmissionRow)}>
                      Chấm bài
                    </Button>
                  </div>
                )
              }
            ]}
            data={submissions}
            keyExtractor={(r) => r.id}
          />
        </div>
      </Card>

      {/* Grading Modal */}
      {gradingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg">Chấm bài: {gradingSub.student}</h3>
              <Button variant="outline" size="sm" className="p-2 border-0" onClick={() => setGradingSub(null)}>
                <X size={20} />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase">Nội dung bài làm</h4>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {gradingSub.content || 'Sinh viên không nộp nội dung văn bản.'}
                </div>
              </div>

              {gradingSub.aiScore != null && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-lg">
                  <p className="font-bold text-indigo-800 dark:text-indigo-300">Gợi ý từ AI</p>
                  <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">Điểm đánh giá sơ bộ: <span className="font-mono font-bold text-lg">{gradingSub.aiScore}/100</span></p>
                  {!!gradingSub.aiFeedback && (
                    <p className="mt-2 text-sm italic opacity-80">{String(gradingSub.aiFeedback)}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <Input 
                    label="Điểm (Hệ 10)" 
                    type="number" 
                    step="0.5"
                    min="0"
                    max="10"
                    value={score.toString()} 
                    onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))} 
                    className="text-lg font-bold"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nhận xét / Phản hồi
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Nhập nhận xét cho sinh viên..."
                    className="w-full min-h-[100px] p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900">
              <Button variant="outline" onClick={() => setGradingSub(null)}>Hủy</Button>
              <Button onClick={handleGrade} disabled={isGrading || score === ''} className="bg-brand-600 hover:bg-brand-700 text-white">
                {isGrading ? 'Đang lưu...' : <><Save size={16} className="mr-2"/> Lưu điểm</>}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
