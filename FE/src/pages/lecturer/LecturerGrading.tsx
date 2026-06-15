import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow, type StudentRow } from '@/lib/api'
import { Users, Award, ClipboardCheck, CheckCircle2 } from 'lucide-react'

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
    <div className="space-y-8 animate-fade-in-up">

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <PageHeader
            title="Quản Lý Chấm Điểm"
            description="Lướt qua các lớp, chọn danh sách sinh viên và tiến hành đánh giá tự động dựa vào AI hoặc đánh giá thủ công."
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Chấm điểm' }]}
          />
        </div>
      </div>

      {/* Classes Select Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedId(c.id)}
            className={`group relative w-full overflow-hidden rounded-2xl border text-left shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_-5px_rgba(6,81,237,0.15)] ${
              selectedId === c.id
                ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10 ring-1 ring-brand-500/50'
                : 'border-slate-200/70 bg-white dark:border-slate-800/80 dark:bg-[#151821] dark:hover:border-brand-500/30'
            }`}
          >
            {/* Visual background token */}
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-50 transition-transform duration-500 group-hover:scale-[2] ${
              selectedId === c.id ? 'bg-brand-200 dark:bg-brand-500/20' : 'bg-slate-50 dark:bg-[#1a1f2e]'
            }`} />

            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold leading-none font-mono tracking-wider ${
                  selectedId === c.id
                    ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {c.code}
                </span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  selectedId === c.id ? 'bg-white text-brand-600 dark:bg-brand-900 dark:text-brand-400 shadow-sm' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}>
                  {selectedId === c.id ? <CheckCircle2 size={16} /> : <ClipboardCheck size={16} />}
                </div>
              </div>

              <h2 className={`text-xl font-black tracking-tight line-clamp-1 mb-1 ${
                selectedId === c.id ? 'text-brand-900 dark:text-brand-100' : 'text-slate-900 dark:text-white'
              }`}>
                {c.name}
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Sổ điểm thành phần
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800/80">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Users size={16} className={selectedId === c.id ? 'text-brand-500' : 'text-slate-400'} />
                  {c.studentCount} Sinh viên
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Grading Workspace */}
      <Card padding="none" className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5 dark:border-slate-800/80 dark:bg-slate-800/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-brand-600 dark:bg-orange-500/10 dark:text-brand-400">
              <Award size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedId ? 'Danh sách chấm điểm sinh viên' : 'Chọn lớp để bắt đầu chấm điểm'}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedId ? 'Cập nhật điểm trực tiếp theo thời gian thực' : 'Xem và quản lý điểm số của sinh viên'}
              </p>
            </div>
          </div>
        </div>

        {/* Data Presentation Table Wrapper */}
        <div className="p-6 overflow-x-auto">
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-slate-50 p-5 dark:bg-slate-800/50">
                <ClipboardCheck size={40} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="mt-5 text-lg font-bold text-slate-900 dark:text-slate-200">Trình Quản Lý Điểm Số</p>
              <p className="mt-2 text-sm max-w-sm text-slate-500 dark:text-slate-400">
                Vui lòng nhấp chọn một thẻ lớp học ở danh sách phía trên để bắt đầu chấm bài cho sinh viên.
              </p>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: 'studentId',
                  header: 'MSSV',
                  render: (r) => (
                    <span className="font-mono text-sm font-bold tracking-wider text-slate-700 dark:text-slate-300">
                      {(r as StudentRow).studentId}
                    </span>
                  )
                },
                {
                  key: 'name',
                  header: 'Họ tên',
                  render: (r) => (
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold uppercase text-slate-600 border border-slate-200/50 shadow-sm dark:bg-[#1a1f2e] dark:border-slate-800 dark:text-slate-300">
                        {(r as StudentRow).name?.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{(r as StudentRow).name}</p>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'progress',
                  header: 'Bài đã nộp (%)',
                  render: (r) => (
                    <div className="flex flex-col gap-1.5 py-1 justify-center w-full max-w-[120px]">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-400">
                         <span>{(r as StudentRow).progress || '0%'}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full"
                          style={{ width: (r as StudentRow).progress || '0%' }}
                        />
                      </div>
                    </div>
                  )
                },
                {
                  key: 'grade',
                  header: 'Điểm tổng kết',
                  render: (r) => {
                    const gradeVal = parseFloat((r as StudentRow).grade?.toString() || '0');
                    const hasGrade = (r as StudentRow).grade !== null && (r as StudentRow).grade !== undefined;
                    const isHigh = gradeVal >= 8;
                    const isMed = gradeVal >= 5 && gradeVal < 8;
                    return (
                      <div className="flex items-center py-2">
                        <div className={`flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black shadow-sm border ${
                          !hasGrade ? 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800'
                          : isHigh 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                            : isMed 
                              ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                              : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                        }`}>
                          <span>{hasGrade ? (r as StudentRow).grade : 'Chưa có'}</span>
                        </div>
                      </div>
                    )
                  }
                },
                {
                  key: 'actions',
                  header: '',
                  render: () => (
                    <div className="flex justify-end">
                      <button className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 py-1.5 px-3 rounded-lg transition-colors">
                        Chấm Điểm
                      </button>
                    </div>
                  )
                }
              ]}
              data={students}
              keyExtractor={(r) => r.studentId}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
