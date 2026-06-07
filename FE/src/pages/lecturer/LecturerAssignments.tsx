import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { api, type AssignmentRow } from '@/lib/api'
import { Sparkles, Calendar, Layers, GraduationCap, Inbox, CheckCircle } from 'lucide-react'

const TYPE_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'quiz', label: 'Trắc nghiệm' },
  { id: 'coding', label: 'Lập trình' },
  { id: 'group', label: 'Bài nhóm' },
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

  // Hàm mapping text phân loại để giao diện hiển thị tiếng Việt chỉn chu
  const formatTypeName = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'quiz': return 'Trắc nghiệm'
      case 'coding': return 'Lập trình'
      case 'group': return 'Bài nhóm'
      default: return type
    }
  }

  return (
    <div className="space-y-8 p-1 selection:bg-brand-500 selection:text-white min-h-screen bg-slate-50/50 dark:bg-slate-900/50">

      {/* Premium Studio Page Header Wrapper */}
      <div className="relative rounded-2xl overflow-hidden bg-[#07090e] text-white p-2 border border-white/[0.08] dark:border-white/[0.05] shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative pr-2">
          {/* GIỮ NGUYÊN HOÀN TOÀN cấu trúc title string và component actions nguyên bản */}
          <PageHeader
            title="Quản lý bài tập"
            actions={
              <Link to="/lecturer/ai-generate">
                <Button variant="accent" size="sm" className="font-bold tracking-wide shadow-[0_4px_12px_rgba(243,112,33,0.2)] hover:scale-[1.02] transition-transform duration-200 bg-brand-500 text-white hover:bg-brand-600 border-none">
                  <Sparkles size={14} className="mr-1 animate-pulse" /> Tạo bằng AI
                </Button>
              </Link>
            }
          />
        </div>
      </div>

      {/* Main Table Workspace Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">

        {/* Filter Navigation Tabs Strip */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/40 dark:border-slate-700/50 inline-block min-w-[320px] sm:min-w-[400px]">
            <Tabs items={TYPE_TABS} activeId={tab} onChange={setTab} />
          </div>
        </div>

        {/* Data Grid Section */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          <DataTable
            columns={[
              {
                key: 'title',
                header: 'Tiêu đề',
                render: (r) => (
                  <div className="py-1 max-w-xs sm:max-w-md">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight hover:text-brand-500 dark:hover:text-brand-400 transition-colors duration-150 cursor-pointer truncate">
                      {(r as AssignmentRow).title}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      REF_KEY: {(r as AssignmentRow).id}
                    </p>
                  </div>
                )
              },
              {
                key: 'type',
                header: 'Loại',
                render: (r) => (
                  <div className="py-1">
                    {/* GIỮ NGUYÊN variant="info" của dự án gốc, chỉ style thêm màu sắc ngoài */}
                    <Badge variant="info" className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 font-medium text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-none">
                      {formatTypeName((r as AssignmentRow).type)}
                    </Badge>
                  </div>
                )
              },
              {
                key: 'class',
                header: 'Lớp',
                render: (r) => (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium py-1">
                    <GraduationCap size={13} className="text-slate-400 dark:text-slate-500" />
                    <span>{(r as AssignmentRow).class}</span>
                  </div>
                )
              },
              {
                key: 'due',
                header: 'Hạn nộp',
                render: (r) => (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono py-1">
                    <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
                    <span>{(r as AssignmentRow).due?.slice(0, 10) ?? '—'}</span>
                  </div>
                )
              },
              {
                key: 'submitted',
                header: 'Đã nộp',
                render: (r) => (
                  <div className="flex items-center gap-1 text-xs font-semibold py-1">
                    <Inbox size={13} className="text-slate-400 dark:text-slate-500" />
                    <span className="text-slate-900 dark:text-slate-100">{(r as AssignmentRow).submitted}</span>
                    <span className="text-slate-400 dark:text-slate-500 font-light text-[11px]">sinh viên</span>
                  </div>
                )
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: (r) => (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium py-1">
                    <CheckCircle size={13} className="text-emerald-500 dark:text-emerald-400" />
                    <span>{(r as AssignmentRow).status || 'Đang mở'}</span>
                  </div>
                )
              },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />

          {/* Empty Fallback State Area */}
          {rows.length === 0 && (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900/40 my-2">
              <Layers size={28} className="mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5] mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Không tìm thấy bài tập</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-light mt-1">Hiện tại danh mục phân loại này chưa cấu hình phân phối bài tập.</p>
            </div>
          )}
        </div>

      </Card>
    </div>
  )
}