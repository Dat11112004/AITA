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
    <div className="space-y-8 p-1 sm:p-4 min-h-screen">
      <PageHeader title="Bài tập" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Bài tập' }]} />
      <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/40 dark:border-slate-700/50 inline-block">
        <Tabs items={STATUS_TABS} activeId={tab} onChange={setTab} />
      </div>
      <div className="mt-6 space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Không có bài tập trong tab này.</p>
        ) : (
          rows.map((a) => (
            <Card key={a.id} className="transition-all duration-300 hover:shadow-md hover:border-brand-500/30">
              <div className="p-4 sm:p-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{a.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{a.description}</p>
                  <div className="mt-3 flex gap-2">
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
