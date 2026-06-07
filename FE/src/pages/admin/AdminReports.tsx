import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Select } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { api } from '@/lib/api'
import { BarChart3, TrendingUp, Clock, CheckCircle, BarChart, CalendarRange, AlertCircle, Sparkles } from 'lucide-react'

const REPORT_TABS = [
  { id: 'usage', label: 'Sử dụng hệ thống' },
  { id: 'ai', label: 'Thống kê AI' },
  { id: 'academic', label: 'Học thuật' },
  { id: 'performance', label: 'Hiệu suất GV' },
]

export function AdminReports() {
  const [tab, setTab] = useState('usage')
  const [period, setPeriod] = useState('30d')
  const [report, setReport] = useState<{ summary?: Record<string, number> } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api
      .getAdminReport(period)
      .then((r) => setReport(r as { summary?: Record<string, number> }))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Lỗi tải báo cáo')
      })
  }, [period])

  const usageStats = [
    { id: 'logins', label: 'Lượt đăng nhập', value: report?.summary?.logins ?? '—', icon: TrendingUp },
    { id: 'submissions', label: 'Bài nộp', value: report?.summary?.submissions ?? '—', icon: BarChart3 },
    { id: 'ai-requests', label: 'Yêu cầu AI', value: report?.summary?.aiRequests ?? '—', icon: Clock },
    { id: 'avg-grading', label: 'TB chấm bài (phút)', value: report?.summary?.avgGradingTime ?? '—', icon: CheckCircle },
  ]

  const academicStats = [
    { id: 'avg-score', label: 'Điểm TB toàn hệ thống', value: report?.summary?.avgScore ?? '—', icon: TrendingUp },
    { id: 'pass-rate', label: 'Tỷ lệ đạt (%)', value: report?.summary?.passRate ?? '—', icon: CheckCircle },
    { id: 'submit-rate', label: 'Tỷ lệ nộp bài (%)', value: report?.summary?.submitRate ?? '—', icon: BarChart3 },
    { id: 'active-students', label: 'SV hoạt động', value: report?.summary?.activeStudents ?? '—', icon: Clock },
  ]

  const aiStats = [
    { id: 'gen-count', label: 'Bài tập đã tạo (AI)', value: report?.summary?.generatedExercises ?? '—', icon: Sparkles },
    { id: 'assess-count', label: 'Bài đã chấm (AI)', value: report?.summary?.aiAssessments ?? '—', icon: CheckCircle },
    { id: 'avg-ai-time', label: 'TB thời gian AI (giây)', value: report?.summary?.avgAiTime ?? '—', icon: Clock },
    { id: 'ai-accuracy', label: 'Độ chính xác AI (%)', value: report?.summary?.aiAccuracy ?? '—', icon: TrendingUp },
  ]

  const perfStats = [
    { id: 'active-lecturers', label: 'GV hoạt động', value: report?.summary?.activeLecturers ?? '—', icon: TrendingUp },
    { id: 'classes-managed', label: 'Lớp đang quản lý', value: report?.summary?.classesManaged ?? '—', icon: BarChart3 },
    { id: 'avg-response', label: 'TB thời gian phản hồi', value: report?.summary?.avgResponseTime ?? '—', icon: Clock },
    { id: 'grading-done', label: 'Bài đã chấm', value: report?.summary?.gradingDone ?? '—', icon: CheckCircle },
  ]

  const currentStats = tab === 'usage' ? usageStats : tab === 'ai' ? aiStats : tab === 'performance' ? perfStats : academicStats

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <PageHeader
        title="Phân tích & Thống kê"
        description="Dữ liệu phân tích hiệu suất hệ thống, học thuật, AI và giảng viên."
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Phân tích' }]}
      />

      {/* Bộ Lọc & Tab Lựa Chọn */}
      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
          <Tabs items={REPORT_TABS} activeId={tab} onChange={setTab} />
        </div>

        <div className="p-6 max-w-md">
          <div className="flex items-end gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 mb-0.5">
              <CalendarRange size={18} />
            </div>
            <div className="flex-1">
              <Select
                label="Khoảng thời gian phân tích"
                options={[
                  { value: '7d', label: '7 ngày qua' },
                  { value: '30d', label: '30 ngày qua' },
                  { value: '90d', label: '90 ngày qua' },
                  { value: 'semester', label: 'Học kỳ hiện tại' },
                ]}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div><span className="font-semibold">Lỗi phân tích:</span> {error}</div>
          </div>
        )}
      </Card>

      {/* Grid Danh sách Chỉ số Metrics */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {currentStats.map((s) => (
          <StatCard key={s.id} {...s} />
        ))}
      </div>

      {/* Khu vực Mô phỏng Đồ thị (Chart Placeholder) */}
      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <BarChart className="text-slate-500 w-5 h-5 ml-2" />
          <CardHeader title={`Biểu đồ: ${REPORT_TABS.find((t) => t.id === tab)?.label}`} />
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 py-24 transition-all duration-300">
            <div className="text-center max-w-sm px-4">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto shadow-sm border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 group-hover:scale-110 transition-transform">
                <BarChart3 size={28} className="text-brand-500/80 animate-pulse" />
              </div>
              <h4 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Đang chuẩn bị luồng dữ liệu trực quan</h4>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Biểu đồ sẽ tự động kết xuất đồ thị dạng cột, đường, hoặc tròn ngay khi nhận được cấu trúc mảng analytics đồng bộ từ API.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}