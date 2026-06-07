import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { api, type Option } from '@/lib/api'
import { BarChart3, GraduationCap, Percent, TrendingUp, Presentation } from 'lucide-react'

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
    <div className="space-y-8 p-1 selection:bg-brand-500 selection:text-white min-h-screen bg-slate-50/50 dark:bg-slate-900/50">

      {/* Premium Studio Page Header */}
      <div className="relative rounded-2xl overflow-hidden bg-[#07090e] text-white p-2 border border-white/[0.08] dark:border-white/[0.05] shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative">
          <PageHeader title="Báo cáo học tập" breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Báo cáo' }]} />
        </div>
      </div>

      {/* Control Selector Layer */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-500/10 border border-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <Presentation size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Bộ lọc dữ liệu</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-light">Lựa chọn phân lớp để nạp ma trận thống kê</p>
          </div>
        </div>

        <div className="w-full sm:max-w-xs">
          {/* GIỮ NGUYÊN HOÀN TOÀN cấu trúc props Select cũ */}
          <Select
            label="Lớp học"
            options={[{ value: '', label: 'Tất cả lớp' }, ...classes]}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Analytics Stat Cards Dashboard Track */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* GIỮ NGUYÊN HOÀN TOÀN id và props nguyên bản để không lỗi core logic */}
        <div className="transition-all duration-200 hover:translate-y-[-2px]">
          <StatCard id="avg" label="Điểm trung bình lớp" value={report.avgScore} icon={GraduationCap} />
        </div>
        <div className="transition-all duration-200 hover:translate-y-[-2px]">
          <StatCard id="submit" label="Tỷ lệ nộp bài" value={report.submitRate} icon={Percent} />
        </div>
        <div className="transition-all duration-200 hover:translate-y-[-2px]">
          <StatCard id="pass" label="Tỷ lệ đạt" value={report.passRate} icon={TrendingUp} />
        </div>
      </div>

      {/* Visual Analytics Workspace Section */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 mt-8">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <CardHeader title="Biểu đồ" description="Tích hợp chart khi có thêm dữ liệu analytics" />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
            <BarChart3 size={14} />
          </div>
        </div>

        <div className="p-6">
          <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900/40 text-center flex flex-col items-center justify-center min-h-[220px]">
            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3 shadow-inner">
              <BarChart3 size={18} className="stroke-[1.5]" />
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Analytics Telemetry Canvas</p>

            {/* Điểm số trực quan hóa dưới dạng Code Badging Layout */}
            <div className="mt-3 px-4 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Điểm TB hiện tại:</span>
              <span className="text-sm font-mono font-bold text-brand-500 dark:text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/10">
                {report.avgScore}/10
              </span>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-light mt-2 max-w-sm">
              Vùng hiển thị đồ thị phân phối tần suất điểm số và xu hướng nộp bài. Hệ thống sẵn sàng kết nối với Recharts Component.
            </p>
          </div>
        </div>
      </Card>

    </div>
  )
}