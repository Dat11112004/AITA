import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { api, type StudentProgress as ProgressData } from '@/lib/api'
import { GraduationCap, Trophy, Target, Flame } from 'lucide-react'

export function StudentProgress() {
  const [p, setP] = useState<ProgressData>({ gpa: 0, done: 0, rank: '—', streak: '0', history: [] })

  useEffect(() => {
    api.getStudentProgress().then(setP).catch(console.error)
  }, [])

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen">
      <PageHeader title="Tiến độ học tập" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Tiến độ' }]} />
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard id="gpa" label="Điểm TB môn" value={p.gpa} icon={GraduationCap} />
        <StatCard id="done" label="Bài đã hoàn thành" value={p.done} icon={Target} />
        <StatCard id="rank" label="Xếp hạng lớp" value={p.rank} icon={Trophy} />
        <StatCard id="streak" label="Chuỗi nộp đúng hạn" value={p.streak} icon={Flame} trend="up" trendLabel="HOT" />
      </div>

      <Card className="mt-8 border border-slate-200/80 dark:border-slate-800">
        <CardHeader title="Lịch sử điểm các bài" />
        <div className="p-4 sm:p-6 pt-0 overflow-x-auto">
          {p.history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900/40 text-sm">
              Chưa có điểm được công bố
            </div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-3 px-4">Bài tập</th>
                  <th className="py-3 px-4">Điểm</th>
                  <th className="py-3 px-4">Ngày nộp</th>
                </tr>
              </thead>
              <tbody>
                {p.history.map((h, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800/60 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{h.assignment}</td>
                    <td className="py-3 px-4">
                       <span className={`px-2 py-0.5 rounded text-xs font-bold border ${typeof h.score === 'number' && h.score >= 8 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : typeof h.score === 'number' && h.score >= 5 ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                         {h.score ?? '—'}
                       </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{h.date ? new Date(h.date).toLocaleDateString('vi') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
