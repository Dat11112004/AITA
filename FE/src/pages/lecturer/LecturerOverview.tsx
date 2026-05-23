import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api, type SubmissionRow } from '@/lib/api'
import { Sparkles } from 'lucide-react'

export function LecturerOverview() {
  const [stats, setStats] = useState<Record<string, string | number>>({})
  const [recent, setRecent] = useState<SubmissionRow[]>([])

  useEffect(() => {
    api.getStatsOverview().then(setStats).catch(console.error)
    api.getRecentSubmissions(5).then(setRecent).catch(console.error)
  }, [])

  const statCards = [
    { id: 'classes', label: 'Lớp đang dạy', value: stats.classes ?? '—' },
    { id: 'pending', label: 'Bài chờ chấm', value: stats.pending ?? '—' },
    { id: 'ai-review', label: 'Kết quả AI chờ duyệt', value: stats['ai-review'] ?? '—' },
    { id: 'students', label: 'Tổng sinh viên', value: stats.students ?? '—' },
  ]

  return (
    <div>
      <PageHeader
        title="Bảng điều khiển giảng viên"
        actions={
          <>
            <Link to="/lecturer/ai-generate">
              <Button variant="accent" size="sm"><Sparkles size={16} /> Tạo bài AI</Button>
            </Link>
            <Link to="/lecturer/grading"><Button size="sm">Chấm bài</Button></Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => <StatCard key={s.id} {...s} />)}
      </div>
      <Card className="mt-8">
        <CardHeader title="Bài nộp gần đây" action={<Link to="/lecturer/grading"><Button variant="ghost" size="sm">Xem tất cả</Button></Link>} />
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có bài nộp</p>
        ) : (
          <ul className="divide-y text-sm">
            {recent.map((s) => (
              <li key={s.id} className="flex justify-between py-2">
                <span>{s.student} — {s.assignment}</span>
                <span className="text-slate-500">{s.submittedAt ? new Date(s.submittedAt).toLocaleString('vi') : '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
