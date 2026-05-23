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
    <div>
      <PageHeader title="Nộp bài" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Bài nộp' }]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Form nộp bài" />
          <Select label="Bài tập" options={assignments} value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} />
          <Tabs items={SUBMIT_TABS} activeId={tab} onChange={setTab} />
          <div className="mt-4 space-y-4">
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
                <Textarea label="Source code" className="font-mono text-sm min-h-[200px]" value={content} onChange={(e) => setContent(e.target.value)} />
              </>
            )}
            {tab === 'group' && (
              <Textarea label="Mô tả đóng góp / nội dung nhóm" value={content} onChange={(e) => setContent(e.target.value)} />
            )}
            <Button fullWidth onClick={handleSubmit} disabled={submitting}>
              <FileCode size={16} />
              {submitting ? 'Đang nộp...' : 'Nộp bài'}
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader title="Lịch sử nộp" />
          <DataTable
            columns={[
              { key: 'assignment', header: 'Bài tập' },
              { key: 'submittedAt', header: 'Thời gian' },
              { key: 'status', header: 'Trạng thái' },
            ]}
            data={history}
            keyExtractor={(r) => r.id}
          />
        </Card>
      </div>
    </div>
  )
}
