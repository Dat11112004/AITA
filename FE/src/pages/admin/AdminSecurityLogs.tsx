import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { api, type SecurityLog } from '@/lib/api'
import { Shield, AlertTriangle, Info, Filter, Database, ShieldAlert, Terminal } from 'lucide-react'

const LEVEL_OPTIONS = [
  { value: '', label: 'Tất cả mức độ' },
  { value: 'info', label: 'Thông tin' },
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'danger', label: 'Nguy hiểm' },
]

export function AdminSecurityLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [level, setLevel] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    const params: Record<string, string> = {}
    if (level) params.level = level
    if (dateFrom) params.from = dateFrom
    if (dateTo) params.to = dateTo
    api.getSecurityLogs(params).then(setLogs).catch(console.error)
  }, [level, dateFrom, dateTo])

  const filteredLogs = search
    ? logs.filter(l =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.detail.toLowerCase().includes(search.toLowerCase())
    )
    : logs

  const levelIcon = (l: string) => {
    if (l === 'danger') return <ShieldAlert size={16} className="text-red-500 animate-pulse" />
    if (l === 'warning') return <AlertTriangle size={16} className="text-amber-500" />
    return <Info size={16} className="text-blue-500" />
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <PageHeader
        title="Bảo mật & Nhật ký"
        description="Theo dõi hoạt động người dùng, lịch sử đăng nhập, thay đổi dữ liệu và sự kiện bảo mật hệ thống."
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Bảo mật' }]}
      />

      {/* Summary cards - Thống kê tổng quan số lượng dạng mảng số liệu */}
      <div className="grid gap-5 sm:grid-cols-3">
        <Card className="overflow-hidden border border-blue-100 dark:border-blue-900/30 bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/20">
              <Info size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {logs.filter(l => l.level === 'info').length}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5">Sự kiện thông tin</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border border-amber-100 dark:border-amber-900/30 bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/20">
              <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {logs.filter(l => l.level === 'warning').length}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5">Cảnh báo hệ thống</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border border-red-100 dark:border-red-900/30 bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/20">
              <Shield size={22} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {logs.filter(l => l.level === 'danger').length}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5">Nguy cơ nghiêm trọng</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters - Khối bộ lọc tìm kiếm */}
      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <Filter className="text-slate-500 w-4 h-4 ml-2" />
          <CardHeader title="Bộ lọc tra cứu dữ liệu" />
        </div>
        <div className="p-6">
          <div className="grid gap-5 sm:grid-cols-4 items-end">
            <div className="relative">
              <Input
                placeholder="Tìm từ khóa, tài khoản, chi tiết..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select label="Mức độ sự kiện" options={LEVEL_OPTIONS} value={level} onChange={(e) => setLevel(e.target.value)} />
            <Input label="Ghi nhận từ ngày" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input label="Đến ngày kết thúc" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Log Table - Bảng hiển thị thông tin chi tiết */}
      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <Terminal className="text-slate-500 w-5 h-5 ml-2" />
          <CardHeader title={`Nhật ký hoạt động kiểm toán hệ thống (${filteredLogs.length} mục)`} />
        </div>

        <div className="p-4">
          <div className="overflow-x-auto custom-scrollbar">
            <DataTable
              columns={[
                {
                  key: 'level',
                  header: '',
                  render: (r) => <div className="pl-2 flex justify-center">{levelIcon((r as SecurityLog).level)}</div>,
                  className: 'w-10 text-center'
                },
                {
                  key: 'action',
                  header: 'Hành động thực thi',
                  render: (r) => <span className="font-semibold text-slate-800 dark:text-slate-200">{(r as SecurityLog).action}</span>
                },
                {
                  key: 'user',
                  header: 'Tài khoản',
                  render: (r) => <span className="font-medium text-slate-700 dark:text-slate-300 font-mono text-xs bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-700/60">{(r as SecurityLog).user}</span>
                },
                {
                  key: 'ip',
                  header: 'Địa chỉ IP',
                  render: (r) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{(r as SecurityLog).ip}</span>
                },
                {
                  key: 'detail',
                  header: 'Nội dung chi tiết log',
                  render: (r) => (
                    <span className="text-xs text-slate-500 dark:text-slate-400 max-w-sm block truncate" title={(r as SecurityLog).detail}>
                      {((r as SecurityLog).detail ?? '')}
                    </span>
                  )
                },
                {
                  key: 'level-badge',
                  header: 'Mức độ',
                  render: (r) => {
                    const l = (r as SecurityLog).level
                    return (
                      <Badge variant={l === 'danger' ? 'danger' : l === 'warning' ? 'warning' : 'info'} className="shadow-none">
                        {l === 'danger' ? 'Nguy hiểm' : l === 'warning' ? 'Cảnh báo' : 'Thông tin'}
                      </Badge>
                    )
                  }
                },
                {
                  key: 'createdAt',
                  header: 'Thời gian',
                  render: (r) => <span className="text-xs text-slate-400 whitespace-nowrap font-medium">{new Date((r as SecurityLog).createdAt).toLocaleString('vi')}</span>
                },
              ]}
              data={filteredLogs}
              keyExtractor={(r) => r.id}
            />
          </div>

          {filteredLogs.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-400 dark:text-slate-500 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl mt-2">
              <Database className="mx-auto h-8 w-8 text-slate-300 mb-2 animate-pulse" />
              Không tìm thấy bản ghi nhật ký nào trùng khớp với bộ lọc hiện tại.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}