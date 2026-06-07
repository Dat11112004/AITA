import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
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
        return <Badge className="bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-none">Trắc nghiệm</Badge>
      case 'coding':
        return <Badge className="bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-none">Lập trình</Badge>
      case 'group':
        return <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-none">Bài nhóm</Badge>
      default:
        return <Badge className="bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-none">{type}</Badge>
    }
  }

  return (
    <div className="space-y-8 p-1 selection:bg-brand-500 selection:text-white min-h-screen bg-slate-50/50 dark:bg-slate-900/50">

      {/* Premium Studio Header Grid */}
      <div className="relative rounded-2xl overflow-hidden bg-[#07090e] text-white p-2 border border-white/[0.08] dark:border-white/[0.05] shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between pr-4">
          <PageHeader
            title="Duyệt kết quả AI"
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Duyệt AI' }]}
          />
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-mono border border-white/[0.08] bg-white/[0.03] text-slate-400 self-start sm:self-center mt-2 sm:mt-0">
            <Bot size={13} className="text-brand-500 animate-pulse" />
            <span>PENDING_QUEUE: {rows.length} jobs</span>
          </div>
        </div>
      </div>

      {/* Main Review Console Table Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <CardHeader title="Hàng đợi duyệt" />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
            <Layers size={13} />
          </div>
        </div>

        {/* System Messages Alerts Layer */}
        {error && (
          <div className="m-6 mb-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 flex items-start gap-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div>
              ⚠️ {error}
            </div>
          </div>
        )}

        {/* Premium Core Data Management Table Wrapper */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          <DataTable
            columns={[
              {
                key: 'type',
                header: 'Loại',
                render: (r) => (
                  <div className="py-1">
                    {getTypeBadge((r as AIReviewRow).type)}
                  </div>
                )
              },
              {
                key: 'title',
                header: 'Nội dung',
                render: (r) => (
                  <div className="max-w-md sm:max-w-xl py-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight truncate">
                      {(r as AIReviewRow).title}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                      ID_REF: {(r as AIReviewRow).id}
                    </p>
                  </div>
                )
              },
              {
                key: 'createdAt',
                header: 'Thời gian',
                render: (r) => (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono py-1">
                    <Clock size={12} className="text-slate-400 dark:text-slate-500" />
                    <span>{new Date((r as AIReviewRow).createdAt).toLocaleString('vi')}</span>
                  </div>
                )
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: () => (
                  <div className="py-1">
                    {/* GIỮ NGUYÊN HOÀN TOÀN variant="warning" nguyên bản gốc */}
                    <Badge variant="warning">Chờ duyệt</Badge>
                  </div>
                )
              },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <div className="flex items-center justify-end gap-2 py-1">
                    <Button
                      size="sm"
                      onClick={() => review(r.id, true)}
                      className="h-8 px-3 rounded-lg bg-slate-950 dark:bg-emerald-600 font-bold text-white text-xs hover:bg-emerald-600 dark:hover:bg-emerald-500 shadow-none transition-all duration-200 flex items-center gap-1 border-0"
                    >
                      <Check size={12} className="stroke-[3]" />
                      <span>Duyệt</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => review(r.id, false)}
                      className="h-8 px-3 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs transition-all duration-200 flex items-center gap-1"
                    >
                      <X size={12} className="stroke-[2.5]" />
                      <span>Từ chối</span>
                    </Button>
                  </div>
                ),
              },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />

          {/* Empty Fallback State Area */}
          {rows.length === 0 && !error && (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900/40 my-2">
              <FileCheck size={28} className="mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5] mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Hàng đợi trống</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-light mt-1">Hiện không có tác vụ sinh bài tập AI nào cần thẩm định.</p>
            </div>
          )}
        </div>

      </Card>
    </div>
  )
}