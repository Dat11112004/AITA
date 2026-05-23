import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api, type SubmissionRow, type Option } from '@/lib/api'
import { FileCheck } from 'lucide-react'

const GRADE_TABS = [
  { id: 'pending', label: 'Chờ chấm' },
  { id: 'ai-done', label: 'AI đã chấm' },
  { id: 'published', label: 'Đã công bố' },
]

export function LecturerGrading() {
  const [tab, setTab] = useState('pending')
  const [classId, setClassId] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const [classes, setClasses] = useState<Option[]>([])
  const [assignments, setAssignments] = useState<Option[]>([])
  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [selected, setSelected] = useState<SubmissionRow | null>(null)
  const [assessing, setAssessing] = useState(false)

  useEffect(() => {
    api.getClassOptions().then(setClasses).catch(console.error)
  }, [])

  useEffect(() => {
    if (!classId) return setAssignments([])
    api.getAssignmentOptions(classId).then(setAssignments).catch(console.error)
  }, [classId])

  const load = useCallback(() => {
    const params: Record<string, string> = { status: tab }
    if (assignmentId) params.assignmentId = assignmentId
    api.getSubmissions(params).then(setRows).catch(console.error)
  }, [tab, assignmentId])

  useEffect(() => {
    load()
  }, [load])

  const runAI = async () => {
    if (!selected) return
    setAssessing(true)
    try {
      const res = await api.assessSubmission(selected.id)
      setSelected({ ...selected, ...res.submission, aiScore: res.aiScore, aiFeedback: res.feedback })
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi')
    } finally {
      setAssessing(false)
    }
  }

  const publish = async () => {
    if (!selected) return
    await api.publishSubmission(selected.id, typeof selected.aiScore === 'number' ? selected.aiScore : undefined)
    alert('Đã công bố điểm')
    load()
  }

  return (
    <div>
      <PageHeader title="Chấm bài & đánh giá" breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Chấm bài' }]} />
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          <Select label="Lớp học" options={classes} value={classId} onChange={(e) => setClassId(e.target.value)} />
          <Select label="Bài tập" options={assignments} value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} />
        </div>
        <div className="mt-4"><Tabs items={GRADE_TABS} activeId={tab} onChange={setTab} /></div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Danh sách bài nộp" />
          <DataTable
            columns={[
              {
                key: 'student',
                header: 'Sinh viên',
                render: (r) => (
                  <button type="button" className="text-left text-brand-700 hover:underline" onClick={() => setSelected(r as SubmissionRow)}>
                    {(r as SubmissionRow).student}
                  </button>
                ),
              },
              { key: 'submittedAt', header: 'Thời gian', render: (r) => String((r as SubmissionRow).submittedAt ?? '—').slice(0, 16) },
              { key: 'aiScore', header: 'Điểm AI', render: (r) => <Badge variant="neutral">{String((r as SubmissionRow).aiScore ?? '—')}</Badge> },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Chi tiết chấm bài" />
          {selected ? (
            <>
              <pre className="max-h-48 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">{selected.content ?? '// Không có code'}</pre>
              {selected.aiFeedback && (
                <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-brand-50 p-4 text-xs">{JSON.stringify(selected.aiFeedback, null, 2)}</pre>
              )}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={runAI} disabled={assessing}><FileCheck size={16} /> {assessing ? 'Đang chấm...' : 'Chạy AI'}</Button>
                <Button onClick={publish}>Công bố điểm</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Chọn bài nộp từ danh sách</p>
          )}
        </Card>
      </div>
    </div>
  )
}
