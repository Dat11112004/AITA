import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api, type LearningData } from '@/lib/api'

const levelVariant: Record<string, 'danger' | 'warning' | 'success'> = {
  weak: 'danger',
  medium: 'warning',
  strong: 'success',
}

const levelLabel: Record<string, string> = {
  weak: 'Cần cải thiện',
  medium: 'Trung bình',
  strong: 'Khá',
}

export function StudentLearning() {
  const [data, setData] = useState<LearningData>({ skills: [], recommendations: [] })

  useEffect(() => {
    api.getStudentLearning().then(setData).catch(console.error)
  }, [])

  return (
    <div>
      <PageHeader title="Lộ trình học tập" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Lộ trình học' }]} />
      <Card className="mb-6">
        <CardHeader title="Phân tích kỹ năng" />
        <div className="space-y-3">
          {data.skills.map((s) => (
            <div key={s.topic} className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="font-medium">{s.topic}</span>
              <Badge variant={levelVariant[s.level] ?? 'neutral'}>{levelLabel[s.level] ?? s.level}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Đề xuất ôn tập" />
        {data.recommendations.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có đề xuất</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.recommendations.map((r, i) => (
              <li key={i} className="rounded-lg bg-brand-50 px-3 py-2">
                [{r.type}] {r.title}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
