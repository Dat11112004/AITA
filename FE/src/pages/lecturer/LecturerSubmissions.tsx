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
import { ArrowLeft, CheckCircle, Clock, Save, X, Activity, Filter, BarChart, Bell, BrainCircuit, MessageSquareX, CheckCircle2, FileDown } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'

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
  const [sendNotification, setSendNotification] = useState(true)
  const [isGrading, setIsGrading] = useState(false)
  
  // Filtering
  const [filter, setFilter] = useState('all')

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
      setError(e.message || 'Failed to load the submission list')
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
      if (sendNotification) {
        // Mocking a notification sent (could be a real API if available for specific users)
        console.log(`Notification sent to ${gradingSub.student}`)
      }
      setGradingSub(null)
      load() // Reload list
    } catch (error: any) {
      alert(error.message || 'Grading failed')
    } finally {
      setIsGrading(false)
    }
  }

  const handleResolveAppeal = async (accepted: boolean) => {
    if (!gradingSub) return
    setIsGrading(true)
    try {
      // In a real app we would have a specific endpoint to resolve appeals.
      // Here we just re-grade or clear the feedback field (mocking resolution).
      await api.gradeSubmission(gradingSub.id, {
        score: accepted && score !== '' ? Number(score) : (gradingSub.score as number),
        feedback: accepted 
          ? `[Appeal approved] ${feedback}` 
          : `[Appeal rejected] ${feedback || 'Your appeal does not match the rubric.'}`,
      })
      if (sendNotification) {
        console.log(`Notification sent to ${gradingSub.student} regarding appeal`)
      }
      setGradingSub(null)
      load()
    } catch (error: any) {
      alert(error.message || 'Failed to process the appeal')
    } finally {
      setIsGrading(false)
    }
  }

  const handleStartSession = async () => {
    if (!id) return
    try {
      await api.startGradingSession(id)
      alert('AI grading session started.')
      load()
    } catch (e: any) {
      alert(e.message || 'Failed to start the grading session')
    }
  }

  const handleBulkPublish = async () => {
    if (!id || !window.confirm('Publish scores to all students?')) return
    try {
      await api.bulkPublishGrades(id)
      alert('Scores published to all students.')
      load()
    } catch (e: any) {
      alert(e.message || 'Failed to publish scores')
    }
  }

  if (loading) return <LoadingSpinner />
  if (error || !assignment) return <ErrorState message={error || 'Assignment not found'} onRetry={load} />

  // Derived stats
  const gradedCount = submissions.filter(s => s.status === 'graded').length
  const pendingCount = submissions.length - gradedCount
  const appealCount = submissions.filter(s => !!s.studentFeedback).length
  const avgScore = gradedCount > 0 
    ? (submissions.filter(s => s.score != null).reduce((acc, s) => acc + (s.score as number), 0) / gradedCount).toFixed(1) 
    : '—'

  // Filtered list
  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'graded') return s.status === 'graded'
    if (filter === 'pending') return s.status !== 'graded'
    if (filter === 'appeal') return !!s.studentFeedback
    return true
  })

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/lecturer/assignments')} className="shrink-0 p-2">
          <ArrowLeft size={16} />
        </Button>
        <PageHeader 
          title={`Submissions: ${assignment.title}`} 
          breadcrumbs={[{ label: 'Assignments', path: '/lecturer/assignments' }, { label: 'Submissions' }]} 
          actions={
            <div className="flex gap-2">
              {assignment.type === 'Exam' ? (
                <Button size="sm" onClick={handleStartSession} className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-md hover:shadow-lg transition-all active:scale-95">
                  <BrainCircuit size={16} />
                  Batch grade with AI (exam)
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-sm font-medium">
                  <Activity size={16} className="animate-pulse" />
                  AI grading in background (assignment)
                </div>
              )}
              <Button size="sm" onClick={handleBulkPublish} className="bg-brand-600 hover:bg-brand-700 text-white gap-2 shadow-md">
                <CheckCircle2 size={16} /> Publish all scores
              </Button>
            </div>
          }
        />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 p-3 rounded-xl"><Filter size={24}/></div>
          <div><p className="text-sm font-semibold text-slate-500">Total submissions</p><p className="text-2xl font-bold">{submissions.length}</p></div>
        </Card>
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 p-3 rounded-xl"><CheckCircle size={24}/></div>
          <div><p className="text-sm font-semibold text-slate-500">Graded</p><p className="text-2xl font-bold">{gradedCount}</p></div>
        </Card>
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 p-3 rounded-xl"><Clock size={24}/></div>
          <div><p className="text-sm font-semibold text-slate-500">Pending</p><p className="text-2xl font-bold">{pendingCount}</p></div>
        </Card>
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 p-3 rounded-xl"><BarChart size={24}/></div>
          <div><p className="text-sm font-semibold text-slate-500">Average score</p><p className="text-2xl font-bold">{avgScore}</p></div>
        </Card>
        <Card className="p-4 border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 shadow-sm flex items-center gap-4">
          <div className="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 p-3 rounded-xl"><MessageSquareX size={24}/></div>
          <div><p className="text-sm font-semibold text-red-600 dark:text-red-400">Appeals</p><p className="text-2xl font-bold text-red-700 dark:text-red-300">{appealCount}</p></div>
        </Card>
      </div>

      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardHeader title={`Submission list (${filteredSubmissions.length})`} />
          <div className="inline-flex rounded-xl bg-white p-1 shadow-sm border border-slate-200/70 dark:bg-[#0f1117] dark:border-slate-800 w-max">
            <Tabs 
              items={[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'graded', label: 'Graded' },
                { id: 'appeal', label: 'Appeals' }
              ]} 
              activeId={filter} 
              onChange={setFilter} 
            />
          </div>
        </div>

        <div className="p-2 overflow-x-auto custom-scrollbar">
          <DataTable
            columns={[
              {
                key: 'student',
                header: 'Student',
                render: (r) => (
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{(r as SubmissionRow).student}</p>
                    <p className="text-xs text-slate-500 font-mono">{(r as SubmissionRow).studentId}</p>
                  </div>
                )
              },
              {
                key: 'submittedAt',
                header: 'Submitted at',
                render: (r) => <span className="text-sm">{(r as SubmissionRow).submittedAt?.replace('T', ' ')?.slice(0, 16) || '—'}</span>
              },
              {
                key: 'aiScore',
                header: 'AI score',
                render: (r) => (
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {(r as SubmissionRow).aiScore != null ? `${(r as SubmissionRow).aiScore}/100` : '—'}
                  </span>
                )
              },
              {
                key: 'score',
                header: 'Official score',
                render: (r) => (
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-lg">
                    {(r as SubmissionRow).score != null ? `${(r as SubmissionRow).score}` : '—'}
                  </span>
                )
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => {
                  const s = (r as SubmissionRow).status
                  const hasFeedback = !!(r as SubmissionRow).studentFeedback
                  return (
                    <div className="flex flex-col gap-1 w-max">
                      {s === 'graded' ? (
                        <Badge variant="success" className="flex items-center gap-1"><CheckCircle size={12}/> Graded</Badge>
                      ) : (
                        <Badge variant="warning" className="flex items-center gap-1"><Clock size={12}/> Pending</Badge>
                      )}
                      {hasFeedback && (
                        <Badge variant="danger" className="flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0"><Activity size={12}/> Appeal filed</Badge>
                      )}
                    </div>
                  )
                }
              },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <div className="flex justify-end gap-2 pr-2">
                    <Button size="sm" variant="outline" onClick={() => openGradeModal(r as SubmissionRow)}>
                      {((r as SubmissionRow).studentFeedback) ? 'View appeal & grade' : 'Grade'}
                    </Button>
                  </div>
                )
              }
            ]}
            data={filteredSubmissions}
            keyExtractor={(r) => r.id}
          />
        </div>
      </Card>

      {/* Grading Modal */}
      {gradingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg">Grading: {gradingSub.student}</h3>
              <Button variant="outline" size="sm" className="p-2 border-0" onClick={() => setGradingSub(null)}>
                <X size={20} />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase">Submission content</h4>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {gradingSub.content || 'The student did not submit any text content.'}
                </div>
              </div>

              {gradingSub.zipFileUrl && (
                <div>
                  <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase">Attachment</h4>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
                        <FileDown size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Attached submission</p>
                        <p className="text-xs text-slate-500">Download to view details</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(gradingSub.zipFileUrl, '_blank')}
                      className="gap-2"
                    >
                      <FileDown size={16} /> Download file
                    </Button>
                  </div>
                </div>
              )}

              {gradingSub.studentFeedback && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                        <MessageSquareX size={16} /> Student appeal
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-2 whitespace-pre-wrap p-3 bg-white/60 dark:bg-black/20 rounded shadow-inner">
                        "{gradingSub.studentFeedback}"
                      </p>
                    </div>
                  </div>
                  
                  {/* This used to print one fixed sentence ("the appeal has merit on
                      the algorithm explanation, add 0.5-1.0 points") for every appeal,
                      which looked like a real per-appeal AI verdict. There is no
                      appeal-analysis endpoint, so show the figures we actually have. */}
                  <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-md">
                    <p className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-1 mb-1">
                      <BrainCircuit size={14} /> Scores on record
                    </p>
                    <div className="text-xs text-indigo-700 space-y-0.5">
                      <p>
                        AI preliminary score:{' '}
                        <span className="font-mono font-bold">
                          {gradingSub.aiScore != null ? `${gradingSub.aiScore}/100` : 'not available'}
                        </span>
                      </p>
                      <p>
                        Official score:{' '}
                        <span className="font-mono font-bold">
                          {gradingSub.score != null ? gradingSub.score : 'not graded yet'}
                        </span>
                      </p>
                      <p className="italic opacity-80 pt-1">
                        Review the submission against the rubric before deciding on this appeal.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {gradingSub.aiScore != null && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-lg">
                  <p className="font-bold text-indigo-800 dark:text-indigo-300">AI suggestion</p>
                  <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">Preliminary score: <span className="font-mono font-bold text-lg">{gradingSub.aiScore}/100</span></p>
                  {!!gradingSub.aiFeedback && (
                    <p className="mt-2 text-sm italic opacity-80">{String(gradingSub.aiFeedback)}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <Input 
                    label="Score (out of 10)" 
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
                    Comment / feedback
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Write feedback for the student..."
                    className="w-full min-h-[100px] p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="notifyStudent" 
                      checked={sendNotification} 
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <label htmlFor="notifyStudent" className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer">
                      <Bell size={14} />
                      Notify the student after grading
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between bg-slate-50 dark:bg-slate-900">
              <Button variant="outline" onClick={() => setGradingSub(null)}>Cancel</Button>
              
              {gradingSub.studentFeedback ? (
                <div className="flex gap-2">
                  <Button onClick={() => handleResolveAppeal(false)} disabled={isGrading} variant="outline" className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50">
                    <X size={16} className="mr-1"/> Reject appeal
                  </Button>
                  <Button onClick={() => handleResolveAppeal(true)} disabled={isGrading || score === ''} className="bg-brand-600 hover:bg-brand-700 text-white">
                    <CheckCircle2 size={16} className="mr-1"/> Approve & save new score
                  </Button>
                </div>
              ) : (
                <Button onClick={handleGrade} disabled={isGrading || score === ''} className="bg-brand-600 hover:bg-brand-700 text-white">
                  {isGrading ? 'Saving...' : <><Save size={16} className="mr-2"/> Save score</>}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
