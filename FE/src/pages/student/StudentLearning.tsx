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
    <div className="space-y-8 p-1 sm:p-4 min-h-screen">
      <PageHeader title="Lộ trình học tập" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Lộ trình học' }]} />
      <Card className="mb-6">
        <CardHeader title="Phân tích kỹ năng" />
        <div className="space-y-3 p-4 sm:p-6 pt-0">
          {data.skills.map((s) => (
            <div key={s.topic} className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
              <span className="font-medium text-slate-800 dark:text-slate-200">{s.topic}</span>
              <Badge variant={levelVariant[s.level] ?? 'neutral'}>{levelLabel[s.level] ?? s.level}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Đề xuất ôn tập" />
        <div className="p-4 sm:p-6 pt-0">
          {data.recommendations.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có đề xuất</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recommendations.map((r, i) => (
                <li key={i} className="rounded-lg bg-brand-50 dark:bg-brand-900/20 px-3 py-2 text-brand-900 dark:text-brand-100 border border-brand-100 dark:border-brand-900/50">
                  <strong className="font-bold">[{r.type}]</strong> {r.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}
