import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Select } from '@/components/ui/Input'
import { api } from '@/lib/api'

const REPORT_TABS = [
  { id: 'usage', label: 'Sử dụng hệ thống' },
  { id: 'ai', label: 'Thống kê AI' },
  { id: 'academic', label: 'Học thuật' },
]

export function AdminReports() {
  const [tab, setTab] = useState('usage')
  const [period, setPeriod] = useState('30d')
  const [report, setReport] = useState<{ summary?: Record<string, number> } | null>(null)

  useEffect(() => {
    api.getAdminReport(period).then((r) => setReport(r as { summary?: Record<string, number> })).catch(console.error)
  }, [period])

  return (
    <div>
      <PageHeader title="Báo cáo hệ thống" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Báo cáo' }]} />
      <Card>
        <Tabs items={REPORT_TABS} activeId={tab} onChange={setTab} />
        <div className="mt-4 max-w-xs">
          <Select
            label="Khoảng thời gian"
            options={[
              { value: '7d', label: '7 ngày' },
              { value: '30d', label: '30 ngày' },
              { value: 'semester', label: 'Học kỳ' },
            ]}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
        <div className="mt-6">
          <h3 className="text-base font-semibold">Báo cáo: {REPORT_TABS.find((t) => t.id === tab)?.label}</h3>
        </div>
        {report?.summary ? (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(report.summary).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs text-slate-500 capitalize">{k}</dt>
                <dd className="text-2xl font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-slate-500">Đang tải...</p>
        )}
      </Card>
    </div>
  )
}
