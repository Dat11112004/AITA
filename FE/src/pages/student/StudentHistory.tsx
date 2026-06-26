import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { api, type SubmissionHistoryRow } from '@/lib/api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { History, Search, Download, Clock } from 'lucide-react'
import { Input } from '@/components/ui/Input'

export function StudentHistory() {
  const [history, setHistory] = useState<SubmissionHistoryRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true;
    api.getSubmissionHistory()
      .then((d) => { if (alive) setHistory(d) })
      .catch((e) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const filtered = history.filter(h => 
    h.assignment.toLowerCase().includes(search.toLowerCase()) || 
    h.className.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen">
      <PageHeader
        title="Lịch sử bài tập & Repo"
        description="Xem lại các phiên bản đã nộp, điểm số, phản hồi AI và quản lý kho lưu trữ bài làm cá nhân (FE-S-07)."
        breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Lịch sử' }]}
      />

      <div className="mb-6 flex flex-wrap gap-4 items-center">
         <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input 
              placeholder="Tìm kiếm theo tên bài tập hoặc lớp..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
         </div>
         <Badge variant="neutral" className="px-3 py-1.5 h-auto">{filtered.length} bản lưu trữ</Badge>
      </div>

      <Card>
        <CardHeader title="Kho lưu trữ mã nguồn" />
        <div className="p-4 sm:p-6 pt-0 overflow-x-auto">
          <DataTable
            columns={[
              { key: 'assignment', header: 'Bài tập', render: (r) => (
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{(r as SubmissionHistoryRow).assignment}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{(r as SubmissionHistoryRow).className}</span>
                </div>
              )},
              { key: 'submittedAt', header: 'Ngày nộp', render: (r) => (
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Clock size={12} />
                  <span>{new Date((r as SubmissionHistoryRow).submittedAt).toLocaleString('vi')}</span>
                </div>
              )},
              { key: 'language', header: 'Ngôn ngữ', render: (r) => <Badge variant="neutral">{(r as SubmissionHistoryRow).language || 'N/A'}</Badge> },
              { key: 'score', header: 'Điểm số', render: (r) => {
                const row = r as SubmissionHistoryRow
                return (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{row.score ?? '—'}</span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">/ 10</span>
                  </div>
                )
              }},
              { key: 'aiScore', header: 'AI Review', render: (r) => (
                <Badge variant="info">{(r as SubmissionHistoryRow).aiScore ?? '—'}</Badge>
              )},
              { key: 'status', header: 'Trạng thái', render: (r) => {
                const s = (r as SubmissionHistoryRow).status
                return <Badge variant={s === 'graded' ? 'success' : 'warning'}>{s === 'graded' ? 'Đã chấm' : 'Đang xử lý'}</Badge>
              }},
              { key: 'actions', header: '', render: () => (
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" title="Tải xuống code">
                    <Download size={15} />
                  </Button>
                  <Button size="sm" variant="outline">Chi tiết</Button>
                </div>
              )}
            ]}
            data={filtered}
            keyExtractor={(r) => r.id}
            emptyDescription={loading ? "Đang tải dữ liệu lịch sử..." : "Hệ thống chưa ghi nhận bản nộp nào của bạn."}
          />
        </div>
      </Card>
      
      <div className="mt-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
        <div className="h-16 w-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
          <History size={32} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 dark:text-slate-100">Sao lưu tự động</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Hệ thống tự động lưu trữ mã nguồn cho mỗi lần nộp bài. Bạn có thể tải lại code cũ bất cứ lúc nào để phục vụ ôn tập.</p>
        </div>
      </div>
    </div>
  )
}
