import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow, type StudentRow } from '@/lib/api'
import { Users, Award, ClipboardCheck } from 'lucide-react'

export function LecturerGrading() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])

  useEffect(() => {
    api.getClasses().then(setClasses).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    api.getClassStudents(selectedId).then(setStudents).catch(console.error)
  }, [selectedId])

  return (
    <div className="space-y-8 p-1 selection:bg-brand-500 selection:text-white min-h-screen bg-slate-50/50 dark:bg-slate-900/50">

      {/* Premium Studio Page Header Wrapper */}
      <div className="relative rounded-2xl overflow-hidden bg-[#07090e] text-white p-2 border border-white/[0.08] shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative">
          <PageHeader
            title="Quản lý điểm số"
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Chấm điểm' }]}
          />
        </div>
      </div>

      {/* Classes Select Grid Studio */}
      <div className="grid gap-4 md:grid-cols-3">
        {classes.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedId(c.id)}
            className={`w-full rounded-2xl border p-5 text-left shadow-sm transition-all duration-300 relative overflow-hidden group ${selectedId === c.id
              ? 'bg-white dark:bg-slate-800 border-slate-900 dark:border-brand-500 ring-2 ring-slate-950 dark:ring-brand-500/50 shadow-[0_10px_25px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.2)]'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)]'
              }`}
          >
            {/* Decorative background visual token */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full translation-all duration-300 pointer-events-none -mr-4 -mt-4 group-hover:scale-110 ${selectedId === c.id ? 'bg-brand-500/5 dark:bg-brand-500/10' : ''}`} />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded ${selectedId === c.id ? 'bg-slate-950 text-white dark:bg-brand-500/20 dark:text-brand-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  {c.code}
                </span>
                <ClipboardCheck size={14} className={selectedId === c.id ? 'text-brand-500 text-brand-400' : 'text-slate-300 dark:text-slate-600'} />
              </div>

              <p className="font-bold text-slate-900 dark:text-slate-100 tracking-tight text-[15px] line-clamp-1">{c.name}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Users size={13} className="text-slate-400 dark:text-slate-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">{c.studentCount}</span> sinh viên
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Grading Workspace */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 mt-8">

        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <CardHeader title={selectedId ? 'Danh sách chấm điểm sinh viên' : 'Chọn lớp để bắt đầu chấm điểm'} />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-500/30">
            <Award size={13} />
          </div>
        </div>

        {/* Data Presentation Table Wrapper */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          <DataTable
            columns={[
              {
                key: 'studentId',
                header: 'MSSV',
                render: (r) => (
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 py-1 block">
                    {(r as StudentRow).studentId}
                  </span>
                )
              },
              {
                key: 'name',
                header: 'Họ tên',
                render: (r) => (
                  <div className="flex items-center gap-2 py-1">
                    <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center uppercase">
                      {(r as StudentRow).name?.slice(0, 2)}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{(r as StudentRow).name}</span>
                  </div>
                )
              },
              {
                key: 'progress',
                header: 'Tiến độ học',
                render: (r) => (
                  <div className="w-full max-w-[100px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{(r as StudentRow).progress || '0%'}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-500"
                        style={{ width: (r as StudentRow).progress || '0%' }}
                      />
                    </div>
                  </div>
                )
              },
              {
                key: 'grade',
                header: 'Điểm tổng kết',
                render: (r) => (
                  <div className="flex items-center gap-2 py-1">
                    <div className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      Number((r as StudentRow).grade) >= 8
                        ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400'
                        : Number((r as StudentRow).grade) >= 5
                        ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400'
                    }`}>
                      {(r as StudentRow).grade ?? 'Chưa có'}
                    </div>
                  </div>
                )
              },
              {
                key: 'actions',
                header: 'Thao tác',
                render: () => (
                  <button className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
                    Chấm điểm
                  </button>
                )
              }
            ]}
            data={students}
            keyExtractor={(r) => r.studentId}
            emptyDescription="Vui lòng chọn lớp học từ danh sách phía trên."
          />

          {!selectedId && (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900/40 my-2">
              <ClipboardCheck size={28} className="mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5] mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Hệ thống đang chờ</p>
              <p className="text-[11px] text-slate-400 font-light mt-1">Chọn một lớp học để bắt đầu xem và quản lý điểm số của sinh viên.</p>
            </div>
          )}
        </div>

      </Card>
    </div>
  )
}
