import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, /*CardHeader*/ } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { api, type Option } from '@/lib/api'
import { BarChart3, GraduationCap, Percent, TrendingUp, /*Presentation,*/ HelpCircle } from 'lucide-react'

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
    <div className="space-y-8 animate-fade-in-up">

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <PageHeader
            title="Báo Cáo Học Tập"
            description="Phân tích phổ điểm, đánh giá hiệu suất của lớp với hệ thống biểu đồ hỗ trợ."
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Báo cáo' }]}
          />
        </div>
        <div className="flex shrink-0">
          <Select
            label=""
            options={[{ value: '', label: 'Chung tất cả lớp' }, ...classes]}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full sm:min-w-[200px]"
          />
        </div>
      </div>

      {/* Analytics Stat Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="transition-all duration-300 hover:-translate-y-1">
          <StatCard id="avg" label="Điểm trung bình hệ thống" value={report.avgScore} icon={GraduationCap} />
        </div>
        <div className="transition-all duration-300 hover:-translate-y-1">
          <StatCard id="submit" label="Tỷ lệ sinh viên nộp bài" value={report.submitRate} icon={Percent} />
        </div>
        <div className="transition-all duration-300 hover:-translate-y-1">
          <StatCard id="pass" label="Tỷ lệ đạt chuẩn" value={report.passRate} icon={TrendingUp} />
        </div>
      </div>

      {/* Visual Analytics Workspace Section */}
      <Card padding="none" className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821]">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-brand-600 dark:bg-orange-500/10 dark:text-brand-400">
              <BarChart3 size={18} strokeWidth={2} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Biểu đồ phổ điểm</h3>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <div className="py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-900/40 text-center flex flex-col items-center justify-center">
            <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-5 mb-4 shadow-inner text-slate-400 dark:text-slate-500">
              <HelpCircle size={32} className="stroke-[1.5]" />
            </div>

            <p className="text-lg font-bold text-slate-900 dark:text-slate-200">Không hỗ trợ module vẽ đồ thị tĩnh</p>

            <div className="mt-4 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm inline-flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Chỉ số Median:</span>
              <span className="text-base font-mono font-black text-brand-600 dark:text-brand-400 bg-brand-50  dark:bg-brand-500/10 px-2 py-0.5 border border-brand-100 dark:border-brand-500/20 rounded">
                {report.avgScore}/10
              </span>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-3 max-w-sm">
              Sẵn sàng hook data realtime cho các thư viện Recharts/ChartJS trong tương lai.
            </p>
          </div>
        </div>
      </Card>

    </div>
  )
}