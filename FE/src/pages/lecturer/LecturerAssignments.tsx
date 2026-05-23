import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { api, type AssignmentRow } from '@/lib/api'
import { Sparkles } from 'lucide-react'

const TYPE_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'quiz', label: 'Trắc nghiệm' },
  { id: 'coding', label: 'Lập trình' },
  { id: 'group', label: 'Bài nhóm' },
]

export function LecturerAssignments() {
  const [tab, setTab] = useState('all')
  const [rows, setRows] = useState<AssignmentRow[]>([])

  const load = useCallback(() => {
    const params: Record<string, string> = {}
    if (tab !== 'all') params.type = tab
    api.getAssignments(params).then(setRows).catch(console.error)
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <PageHeader
        title="Quản lý bài tập"
        actions={
          <Link to="/lecturer/ai-generate">
            <Button variant="accent" size="sm"><Sparkles size={16} /> Tạo bằng AI</Button>
          </Link>
        }
      />
      <Card>
        <Tabs items={TYPE_TABS} activeId={tab} onChange={setTab} />
        <div className="mt-4">
          <DataTable
            columns={[
              { key: 'title', header: 'Tiêu đề' },
              { key: 'type', header: 'Loại', render: (r) => <Badge variant="info">{(r as AssignmentRow).type}</Badge> },
              { key: 'class', header: 'Lớp' },
              { key: 'due', header: 'Hạn nộp', render: (r) => (r as AssignmentRow).due?.slice(0, 10) ?? '—' },
              { key: 'submitted', header: 'Đã nộp' },
              { key: 'status', header: 'Trạng thái' },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />
        </div>
      </Card>
    </div>
  )
}
