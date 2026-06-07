import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Tabs } from '@/components/ui/Tabs'
import { api, type Option, type SubmissionRow } from '@/lib/api'
import { FileCode } from 'lucide-react'

const SUBMIT_TABS = [
  { id: 'code', label: 'Source code' },
  { id: 'group', label: 'Bài nhóm' },
]

export function StudentSubmissions() {
  const [tab, setTab] = useState('code')
  const [assignments, setAssignments] = useState<Option[]>([])
  const [assignmentId, setAssignmentId] = useState('')
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [history, setHistory] = useState<SubmissionRow[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.getAssignmentOptions().then(setAssignments).catch(console.error)
    api.getSubmissions().then(setHistory).catch(console.error)
  }, [])

  const handleSubmit = async () => {
    if (!assignmentId) return alert('Chọn bài tập')
    setSubmitting(true)
    try {
      await api.submitWork({ assignmentId, content, language: tab === 'code' ? language : undefined })
      alert('Nộp bài thành công')
      setContent('')
      api.getSubmissions().then(setHistory)
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Lỗi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen">
      <PageHeader title="Nộp bài" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Bài nộp' }]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col h-full border border-slate-200/80 dark:border-slate-800">
          <CardHeader title="Form nộp bài" />
          <div className="p-4 sm:p-6 pt-0 flex-1 flex flex-col space-y-4">
            <Select label="Bài tập" options={assignments} value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} />
            <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/40 dark:border-slate-700/50 inline-block w-fit">
              <Tabs items={SUBMIT_TABS} activeId={tab} onChange={setTab} />
            </div>
            <div className="mt-4 flex-1 flex flex-col space-y-4">
              {tab === 'code' && (
                <>
                  <Select
                    label="Ngôn ngữ"
                    options={[
                      { value: 'javascript', label: 'JavaScript' },
                      { value: 'java', label: 'Java' },
                      { value: 'python', label: 'Python' },
                    ]}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  />
                  <div className="flex-1 min-h-[200px]">
                    <Textarea 
                      label="Source code" 
                      className="font-mono text-sm h-full" 
                      value={content} 
                      onChange={(e) => setContent(e.target.value)} 
                    />
                  </div>
                </>
              )}
              {tab === 'group' && (
                <div className="flex-1 min-h-[200px]">
                  <Textarea 
                    label="Mô tả đóng góp / nội dung nhóm" 
                    className="h-full"
                    value={content} 
                    onChange={(e) => setContent(e.target.value)} 
                  />
                </div>
              )}
              <Button fullWidth onClick={handleSubmit} disabled={submitting} className="mt-4 shadow-[0_4px_12px_rgba(15,23,42,0.1)] dark:shadow-[0_4px_12px_rgba(243,112,33,0.2)]">
                <FileCode size={16} className="mr-2" />
                {submitting ? 'Đang nộp...' : 'Nộp bài'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="h-full border border-slate-200/80 dark:border-slate-800">
          <CardHeader title="Lịch sử nộp" />
          <div className="p-4 sm:p-6 pt-0 overflow-x-auto">
            <DataTable
              columns={[
                { 
                  key: 'assignment', 
                  header: 'Bài tập',
                  render: (r) => (
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{(r as SubmissionRow).assignment}</span>
                  )
                 },
                { 
                  key: 'submittedAt', 
                  header: 'Thời gian',
                  render: (r) => (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date((r as SubmissionRow).submittedAt || '').toLocaleString('vi')}
                    </span>
                  )
                 },
                { 
                  key: 'status', 
                  header: 'Trạng thái',
                  render: (r) => (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${(r as SubmissionRow).status === 'graded' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                      {(r as SubmissionRow).status === 'graded' ? 'Đã chấm' : 'Đang xử lý'}
                    </span>
                  )
                 },
              ]}
              data={history}
              keyExtractor={(r) => r.id}
              emptyDescription="Bạn chưa nộp bài tập nào gần đây."
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
