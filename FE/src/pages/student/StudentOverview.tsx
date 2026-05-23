import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

export function StudentOverview() {
  const [stats, setStats] = useState<Record<string, string | number>>({})

  useEffect(() => {
    api.getStatsOverview().then(setStats).catch(console.error)
  }, [])

  return (
    <div>
      <PageHeader
        title="Trang chủ sinh viên"
        actions={<Link to="/student/assignments"><Button size="sm">Xem bài tập</Button></Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard id="classes" label="Lớp đang học" value={stats.classes ?? '—'} />
        <StatCard id="due" label="Bài sắp đến hạn" value={stats.due ?? '—'} />
        <StatCard id="graded" label="Bài đã có điểm" value={stats.graded ?? '—'} />
        <StatCard id="feedback" label="Phản hồi AI mới" value={stats.feedback ?? '—'} />
      </div>
      <Card className="mt-8">
        <CardHeader title="Gợi ý học tập" action={<Link to="/student/learning"><Button variant="ghost" size="sm">Lộ trình đầy đủ</Button></Link>} />
        <p className="text-sm text-slate-600">Xem lộ trình học và phản hồi AI để biết chủ đề cần cải thiện.</p>
      </Card>
    </div>
  )
}
