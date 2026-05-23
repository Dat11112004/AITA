import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { api, type AssignmentRow } from '@/lib/api'

const STATUS_TABS = [
  { id: 'active', label: 'Đang làm' },
  { id: 'submitted', label: 'Đã nộp' },
  { id: 'graded', label: 'Đã chấm' },
  { id: 'overdue', label: 'Quá hạn' },
]

export function StudentAssignments() {
  const [tab, setTab] = useState('active')
  const [rows, setRows] = useState<AssignmentRow[]>([])

  const load = useCallback(() => {
    api.getAssignments({ tab }).then(setRows).catch(console.error)
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <PageHeader title="Bài tập" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Bài tập' }]} />
      <Tabs items={STATUS_TABS} activeId={tab} onChange={setTab} />
      <div className="mt-6 space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Không có bài tập trong tab này.</p>
        ) : (
          rows.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-sm text-slate-500">{a.description}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="info">{a.type}</Badge>
                    {a.due && <Badge variant="warning">Hạn: {a.due.slice(0, 10)}</Badge>}
                  </div>
                </div>
                <Link to="/student/submissions">
                  <Button size="sm">Nộp bài</Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
