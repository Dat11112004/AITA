import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow, type Option } from '@/lib/api'
import { Plus } from 'lucide-react'

export function AdminClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [lecturers, setLecturers] = useState<Option[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', subject: '', semester: 'Spring 2026', campus: '', lecturerId: '' })

  const load = () => api.getClasses().then(setClasses).catch(console.error)

  useEffect(() => {
    load()
    api.getLecturerOptions().then(setLecturers).catch(console.error)
  }, [])

  const handleCreate = async () => {
    await api.createClass({
      code: form.code,
      name: form.name,
      subject: form.subject,
      semester: form.semester,
      campus: form.campus,
      lecturerId: form.lecturerId,
    })
    setShowForm(false)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Lớp & Môn học"
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Lớp & Môn học' }]}
        actions={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} />
            Tạo lớp
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardHeader title="Tạo lớp mới" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Mã lớp" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input label="Tên môn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="Giảng viên" options={lecturers} value={form.lecturerId} onChange={(e) => setForm({ ...form, lecturerId: e.target.value })} />
            <Input label="Học kỳ" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            <Input label="Campus" value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} />
          </div>
          <Button className="mt-4" onClick={handleCreate}>Lưu</Button>
        </Card>
      )}

      <Card>
        <CardHeader title="Danh sách lớp học" />
        <DataTable
          columns={[
            { key: 'code', header: 'Mã lớp' },
            { key: 'name', header: 'Môn học' },
            {
              key: 'lecturer',
              header: 'Giảng viên',
              render: (r) => (r as ClassRow).lecturer?.fullName ?? '—',
            },
            { key: 'studentCount', header: 'Sĩ số' },
            { key: 'semester', header: 'Học kỳ' },
          ]}
          data={classes}
          keyExtractor={(r) => r.id}
        />
      </Card>
    </div>
  )
}
