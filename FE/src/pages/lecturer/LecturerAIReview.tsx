import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api, type AIReviewRow } from '@/lib/api'
import {
  Check,
  X,
  Clock,
  FileCheck,
  AlertTriangle,
  Layers,
  Bot
} from 'lucide-react'

export function LecturerAIReview() {
  const [rows, setRows] = useState<AIReviewRow[]>([])
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api
      .getAIReviews()
      .then(setRows)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu')
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const review = async (id: string, approved: boolean) => {
    try {
      setError('')
      await api.reviewAIJob(id, approved)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi duyệt kết quả')
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'quiz':
        return <Badge variant="neutral" className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-bold border border-brand-100 dark:border-brand-500/20 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">Trắc nghiệm</Badge>
      case 'coding':
        return <Badge variant="neutral" className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-500/20 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">Lập trình</Badge>
      case 'group':
        return <Badge variant="neutral" className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-500/20 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">Bài nhóm</Badge>
      default:
        return <Badge variant="neutral" className="bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-500/20 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">{type}</Badge>
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <PageHeader
            title="Duyệt Kết Quả AI"
            description="Kiểm tra, thẩm định và phê duyệt các câu hỏi hoặc bài tập do hệ thống AI tự động sinh ra."
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Duyệt AI' }]}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 shadow-sm">
          <Bot size={14} className="text-brand-500 animate-pulse" />
          <span className="uppercase tracking-widest font-mono">Queue: {rows.length} Jobs</span>
        </div>
      </div>

      {/* Main Review Console Table Card */}
      <Card padding="none" className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821]">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-brand-600 dark:bg-orange-500/10 dark:text-brand-400">
              <Layers size={18} strokeWidth={2} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Hàng Đợi Thẩm Định</h3>
          </div>
        </div>

        {/* System Messages Alerts Layer */}
        {error && (
          <div className="m-6 mb-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Hệ thống báo lỗi:</span> {error}
            </div>
          </div>
        )}

        {/* Core Data Management Table Wrapper */}
        <div className="p-6 overflow-x-auto">
          {rows.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
               <div className="rounded-full bg-slate-50 p-5 dark:bg-slate-800/50">
                 <FileCheck size={36} className="text-slate-300 dark:text-slate-600" />
               </div>
               <p className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-200">Hàng đợi quản lý trống</p>
               <p className="mt-2 text-sm max-w-sm text-slate-500 dark:text-slate-400">
                 Tất cả nội dung đã được xử lý xong. Hiện không có tác vụ sinh bài tập AI nào cần thẩm định.
               </p>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: 'type',
                  header: 'Phân loại',
                  render: (r) => (
                    <div className="py-2">
                      {getTypeBadge((r as AIReviewRow).type)}
                    </div>
                  )
                },
                {
                  key: 'title',
                  header: 'Nội dung biên dịch',
                  render: (r) => (
                    <div className="max-w-md sm:max-w-xl py-2 pr-4">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-[13px] tracking-tight">
                        {(r as AIReviewRow).title}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 font-bold uppercase tracking-wider">
                        JOB_ID: {(r as AIReviewRow).id.split('-').shift() || (r as AIReviewRow).id}
                      </p>
                    </div>
                  )
                },
                {
                  key: 'createdAt',
                  header: 'Hệ thống xuất bản',
                  render: (r) => (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 py-2">
                      <Clock size={14} className="text-slate-400 dark:text-slate-500" />
                      <span className="tabular-nums font-medium">{new Date((r as AIReviewRow).createdAt).toLocaleString('vi')}</span>
                    </div>
                  )
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: () => (
                    <div className="py-2">
                      <Badge variant="warning" className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-bold px-2 py-0.5 shadow-sm text-[11px] rounded uppercase tracking-wider">Chờ xét</Badge>
                    </div>
                  )
                },
                {
                  key: 'actions',
                  header: '',
                  render: (r) => (
                    <div className="flex items-center justify-end gap-2 py-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => review(r.id, false)}
                        className="bg-transparent hover:bg-slate-100 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors border-none"
                        title="Từ chối nội dung này"
                      >
                        <X size={16} /> Từ chối
                      </Button>
                      
                      <Button
                        variant="primary"
                        onClick={() => review(r.id, true)}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs gap-1 shadow-sm px-4 h-9"
                      >
                        <Check size={14} strokeWidth={3} />
                        Duyệt
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={rows}
              keyExtractor={(r) => r.id}
            />
          )}
        </div>
      </Card>
    </div>
  )
}