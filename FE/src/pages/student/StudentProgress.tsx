import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { api, type StudentProgress as ProgressData } from '@/lib/api'

export function StudentProgress() {
  const [p, setP] = useState<ProgressData>({ gpa: 0, done: 0, rank: '—', streak: '0', history: [] })

  useEffect(() => {
    api.getStudentProgress().then(setP).catch(console.error)
  }, [])

  return (
    <div>
      <PageHeader title="Tiến độ học tập" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Tiến độ' }]} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard id="gpa" label="Điểm TB môn" value={p.gpa} />
        <StatCard id="done" label="Bài đã hoàn thành" value={p.done} />
        <StatCard id="rank" label="Xếp hạng lớp" value={p.rank} />
        <StatCard id="streak" label="Chuỗi nộp đúng hạn" value={p.streak} />
      </div>
      <Card className="mt-8">
        <CardHeader title="Lịch sử điểm các bài" />
        {p.history.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có điểm được công bố</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Bài tập</th>
                <th>Điểm</th>
                <th>Ngày nộp</th>
              </tr>
            </thead>
            <tbody>
              {p.history.map((h, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2">{h.assignment}</td>
                  <td>{h.score ?? '—'}</td>
                  <td>{h.date ? new Date(h.date).toLocaleDateString('vi') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
