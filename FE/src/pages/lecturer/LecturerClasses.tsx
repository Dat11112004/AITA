import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow, type StudentRow } from '@/lib/api'

export function LecturerClasses() {
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
    <div>
      <PageHeader title="Lớp học của tôi" breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Lớp học' }]} />
      <div className="grid gap-4 md:grid-cols-3">
        {classes.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedId(c.id)}
            className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition ${selectedId === c.id ? 'ring-2 ring-brand-500' : 'hover:border-brand-200'}`}
          >
            <p className="font-semibold">{c.code}</p>
            <p className="text-sm text-slate-600">{c.name}</p>
            <p className="mt-2 text-xs text-slate-500">{c.studentCount} sinh viên</p>
          </button>
        ))}
      </div>
      <Card className="mt-8">
        <CardHeader title={selectedId ? 'Sinh viên trong lớp' : 'Chọn một lớp để xem sinh viên'} />
        <DataTable
          columns={[
            { key: 'studentId', header: 'MSSV' },
            { key: 'name', header: 'Họ tên' },
            { key: 'email', header: 'Email' },
            { key: 'progress', header: 'Tiến độ' },
            { key: 'grade', header: 'Điểm TB' },
          ]}
          data={students}
          keyExtractor={(r) => r.studentId}
          emptyDescription="Chọn lớp từ danh sách phía trên."
        />
      </Card>
    </div>
  )
}
