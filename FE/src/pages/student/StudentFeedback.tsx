import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api, type FeedbackRow } from '@/lib/api'

export function StudentFeedback() {
  const [items, setItems] = useState<FeedbackRow[]>([])

  useEffect(() => {
    api.getStudentFeedback().then(setItems).catch(console.error)
  }, [])

  return (
    <div>
      <PageHeader title="Phản hồi AI" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Phản hồi AI' }]} />
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có phản hồi — nộp bài và chờ giảng viên duyệt kết quả AI.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader
                title={item.title}
                action={<Badge variant={item.approved ? 'success' : 'warning'}>{item.approved ? 'Đã duyệt' : 'Chờ duyệt'}</Badge>}
              />
              <p className="text-sm">Điểm AI: {item.aiScore ?? '—'} | Điểm chính thức: {item.score ?? '—'}</p>
              {item.feedback != null && (
                <pre className="mt-4 overflow-auto rounded-xl bg-slate-50 p-4 text-xs">{JSON.stringify(item.feedback, null, 2)}</pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
