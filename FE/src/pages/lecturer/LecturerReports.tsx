import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { api, type Option } from '@/lib/api'

export function LecturerReports() {
  const [classId, setClassId] = useState('')
  const [classes, setClasses] = useState<Option[]>([])
  const [report, setReport] = useState({ avgScore: 0, submitRate: '—', passRate: '—' })

  useEffect(() => {
    api.getClassOptions().then(setClasses).catch(console.error)
  }, [])

  useEffect(() => {
    api.getLecturerReport(classId || undefined).then(setReport).catch(console.error)
  }, [classId])

  return (
    <div>
      <PageHeader title="Báo cáo học tập" breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Báo cáo' }]} />
      <Select label="Lớp học" options={[{ value: '', label: 'Tất cả lớp' }, ...classes]} value={classId} onChange={(e) => setClassId(e.target.value)} className="mb-6 max-w-xs" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard id="avg" label="Điểm trung bình lớp" value={report.avgScore} />
        <StatCard id="submit" label="Tỷ lệ nộp bài" value={report.submitRate} />
        <StatCard id="pass" label="Tỷ lệ đạt" value={report.passRate} />
      </div>
      <Card className="mt-8">
        <CardHeader title="Biểu đồ" description="Tích hợp chart khi có thêm dữ liệu analytics" />
        <p className="text-sm text-slate-500">Điểm TB hiện tại: {report.avgScore}/10</p>
      </Card>
    </div>
  )
}
