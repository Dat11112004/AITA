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
    <div className="space-y-8 p-1 sm:p-4 min-h-screen">
      <PageHeader title="Phản hồi AI" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Phản hồi AI' }]} />
      {items.length === 0 ? (
        <Card className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 mt-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có phản hồi — nộp bài và chờ giảng viên duyệt kết quả AI.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition">
              <CardHeader
                title={item.title}
                action={<Badge variant={item.approved ? 'success' : 'warning'}>{item.approved ? 'Đã duyệt' : 'Chờ duyệt'}</Badge>}
              />
              <div className="p-4 sm:p-6 pt-0">
                <div className="flex flex-wrap gap-4 mb-4 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 inline-block w-fit">
                  <div><span className="text-slate-500 dark:text-slate-400">Điểm AI:</span> <span className="font-bold text-slate-900 dark:text-slate-100">{item.aiScore ?? '—'}</span></div>
                  <div className="text-slate-300 dark:text-slate-700">|</div>
                  <div><span className="text-slate-500 dark:text-slate-400">Điểm chính thức:</span> <span className="font-bold text-brand-600 dark:text-brand-400">{item.score ?? '—'}</span></div>
                </div>
                {item.feedback != null && (
                  <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-300 border border-slate-800 shadow-inner">
                    <code className="font-mono">{JSON.stringify(item.feedback, null, 2)}</code>
                  </pre>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
