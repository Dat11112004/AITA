import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { api, type AssignmentRow } from '@/lib/api'
import { Sparkles, Calendar, Layers, GraduationCap, Inbox, CheckCircle2 } from 'lucide-react'

const TYPE_TABS = [
  { id: 'all', label: 'Tất cả Bài tập' },
  { id: 'quiz', label: 'Trắc nghiệm' },
  { id: 'coding', label: 'Lập trình' },
  { id: 'group', label: 'Bài tập nhóm' },
]

export function LecturerAssignments() {
  const [tab, setTab] = useState('all')
  const [rows, setRows] = useState<AssignmentRow[]>([])

  const load = useCallback(() => {
    const params: Record<string, string> = {}
    if (tab !== 'all') params.type = tab
    api.getAssignments(params).then(setRows).catch(console.error)
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const formatTypeName = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'quiz': return 'Trắc nghiệm'
      case 'coding': return 'Lập trình'
      case 'group': return 'Bài nhóm'
      default: return type
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <PageHeader
            title="Ngân Hàng Bài Tập"
            description="Quản lý cấu trúc bộ câu hỏi, theo dõi thời hạn và giao bài tự động cho sinh viên."
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Bài tập' }]}
          />
        </div>
        
        <div className="flex shrink-0 items-center justify-end">
          <Link to="/lecturer/ai-generate">
            <Button className="h-10 gap-2 bg-gradient-to-r from-brand-600 to-brand-500 font-bold hover:shadow-lg hover:shadow-brand-500/25 transition-all text-white">
              <Sparkles size={16} /> Tạo Đề Thay Thế AI
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Table Workspace Card */}
      <Card padding="none" className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821]">

        {/* Filter Navigation Tabs Strip */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/20">
          <div className="inline-flex rounded-xl bg-white p-1 shadow-sm border border-slate-200/70 dark:bg-[#0f1117] dark:border-slate-800">
            <Tabs items={TYPE_TABS} activeId={tab} onChange={setTab} />
          </div>
        </div>

        {/* Data Grid Section */}
        <div className="p-6 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-slate-50 p-5 dark:bg-slate-800/50">
                <Layers size={36} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-200">Không tìm thấy bài tập</p>
              <p className="mt-2 text-sm max-w-sm text-slate-500 dark:text-slate-400">
                Danh mục này hiện chưa có bài tập nào được tạo. Nhấp vào "Tạo Đề Thay Thế AI" để bắt đầu.
              </p>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Tên bài tập',
                  render: (r) => (
                    <div className="py-2 max-w-xs sm:max-w-md">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight transition-colors cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 line-clamp-1">
                        {(r as AssignmentRow).title}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 font-semibold uppercase tracking-wider">
                        REF_ID: {(r as AssignmentRow).id}
                      </p>
                    </div>
                  )
                },
                {
                  key: 'type',
                  header: 'Phân loại',
                  render: (r) => (
                    <div className="py-2">
                       <Badge variant="neutral" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-none shadow-sm rounded-md px-2.5 py-1 text-[11px] uppercase tracking-wider">
                        {formatTypeName((r as AssignmentRow).type)}
                      </Badge>
                    </div>
                  )
                },
                {
                  key: 'class',
                  header: 'Lớp áp dụng',
                  render: (r) => (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 py-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        <GraduationCap size={12} />
                      </div>
                      <span>{(r as AssignmentRow).class}</span>
                    </div>
                  )
                },
                {
                  key: 'due',
                  header: 'Hạn nộp bài',
                  render: (r) => (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 py-2">
                      <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                      <span className="tabular-nums font-mono">{(r as AssignmentRow).due?.slice(0, 10) ?? '—'}</span>
                    </div>
                  )
                },
                {
                  key: 'submitted',
                  header: 'Bài đã nộp',
                  render: (r) => (
                    <div className="flex items-center gap-1.5 text-xs py-2">
                      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300 font-bold shadow-sm">
                        <Inbox size={12} className="text-brand-500" />
                        <span>{(r as AssignmentRow).submitted}</span>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (r) => (
                    <div className="flex items-center justify-end py-2 pr-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>{(r as AssignmentRow).status || 'Đang nhận bài'}</span>
                      </div>
                    </div>
                  )
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