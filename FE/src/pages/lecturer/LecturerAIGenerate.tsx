import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api, type Option } from '@/lib/api'
import { Sparkles, Loader2 } from 'lucide-react'

const GEN_TABS = [
  { id: 'quiz', label: 'Trắc nghiệm' },
  { id: 'coding', label: 'Lập trình' },
  { id: 'group', label: 'Bài nhóm' },
]

export function LecturerAIGenerate() {
  const [tab, setTab] = useState('quiz')
  const [classes, setClasses] = useState<Option[]>([])
  const [classId, setClassId] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [extra, setExtra] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [assignmentId, setAssignmentId] = useState<string | null>(null)

  useEffect(() => {
    api.getClassOptions().then(setClasses).catch(console.error)
  }, [])

  const handleGenerate = async () => {
    if (!topic) return alert('Nhập chủ đề')
    setGenerating(true)
    try {
      const res = await api.generateExercise({
        classId: classId || undefined,
        type: tab,
        topic,
        difficulty,
        extra,
      })
      setResult(res.result)
      setAssignmentId(res.assignment?.id ?? null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi AI')
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!classId || !result) return alert('Chọn lớp và tạo nội dung trước')
    const r = result as { title?: string; description?: string; content?: unknown }
    await api.saveAIAssignment({
      classId,
      title: r.title ?? `Bài ${topic}`,
      description: r.description,
      type: tab,
      content: r.content ?? r,
      publish: true,
      jobId: assignmentId ?? undefined,
    })
    alert('Đã giao bài cho sinh viên')
  }

  return (
    <div>
      <PageHeader title="Tạo bài tập bằng AI" breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Tạo bài (AI)' }]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tham số tạo bài" />
          <Tabs items={GEN_TABS} activeId={tab} onChange={setTab} />
          <div className="mt-4 space-y-4">
            <Select label="Lớp / Môn học" options={classes} value={classId} onChange={(e) => setClassId(e.target.value)} />
            <Input label="Chủ đề" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <Select
              label="Độ khó"
              options={[
                { value: 'easy', label: 'Dễ' },
                { value: 'medium', label: 'Trung bình' },
                { value: 'hard', label: 'Khó' },
              ]}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            />
            <Textarea label="Yêu cầu bổ sung" value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} />
            <Button variant="accent" fullWidth onClick={handleGenerate} disabled={generating}>
              {generating ? <><Loader2 size={18} className="animate-spin" /> Đang tạo...</> : <><Sparkles size={18} /> Tạo nội dung AI</>}
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader title="Kết quả AI" action={<Badge variant="warning">Chờ duyệt</Badge>} />
          {result ? (
            <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-slate-500">Nhấn「Tạo nội dung AI」</p>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={handlePublish} disabled={!result || !classId}>
              Phê duyệt & Giao bài
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
