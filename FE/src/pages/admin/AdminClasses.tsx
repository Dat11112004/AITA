import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow, type Option } from '@/lib/api'
import { Plus, GraduationCap, TableProperties, Loader2, X } from 'lucide-react'

export function AdminClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [lecturers, setLecturers] = useState<Option[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', subject: '', semester: 'Spring 2026', campus: '', lecturerId: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = () => api.getClasses().then(setClasses).catch(console.error)

  useEffect(() => {
    load()
    api.getLecturerOptions().then(setLecturers).catch(console.error)
  }, [])

  const handleCreate = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.createClass({
        code: form.code,
        name: form.name,
        subject: form.subject,
        semester: form.semester,
        campus: form.campus,
        lecturerId: form.lecturerId,
      })
      // Reset form sau khi tạo thành công
      setForm({ code: '', name: '', subject: '', semester: 'Spring 2026', campus: '', lecturerId: '' })
      setShowForm(false)
      load()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header Section phong cách SaaS hiện đại */}
      <PageHeader
        title="Lớp & Môn học"
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Lớp & Môn học' }]}
        actions={
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className={`shadow-sm transition-all duration-200 flex items-center gap-2 ${showForm
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Đóng bộ lọc' : 'Tạo lớp học mới'}
          </Button>
        }
      />

      {/* Form Tạo Lớp Mới với hiệu ứng trượt xuất hiện */}
      {showForm && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <GraduationCap className="text-brand-500 w-5 h-5 ml-2" />
            <CardHeader title="Tạo lớp mới" />
          </div>

          <div className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Mã lớp" placeholder="Ví dụ: SE1702" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <Input label="Tên môn" placeholder="Ví dụ: Mobile Programming" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Select label="Giảng viên" options={lecturers} value={form.lecturerId} onChange={(e) => setForm({ ...form, lecturerId: e.target.value })} />
              <Input label="Học kỳ" placeholder="Ví dụ: Summer 2026" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
              <Input label="Campus" placeholder="Ví dụ: Quy Nhơn" value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} />
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button
                className="px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none active:scale-95"
                onClick={handleCreate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu dữ liệu...
                  </>
                ) : (
                  'Lưu thông tin lớp'
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Danh Sách Lớp Học */}
      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <TableProperties className="text-slate-500 w-5 h-5 ml-2" />
          <CardHeader title="Danh sách lớp học" />
        </div>

        {/* Bọc div chống tràn layout khi hiển thị trên mobile */}
        <div className="p-2 overflow-x-auto custom-scrollbar">
          <DataTable
            columns={[
              {
                key: 'code',
                header: 'Mã lớp',
                render: (r) => <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{(r as ClassRow).code}</span>
              },
              { key: 'name', header: 'Môn học' },
              {
                key: 'lecturer',
                header: 'Giảng viên',
                render: (r) => (r as ClassRow).lecturer?.fullName ?? <span className="text-slate-400">—</span>,
              },
              {
                key: 'studentCount',
                header: 'Sĩ số',
                render: (r) => <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">{(r as ClassRow).studentCount ?? 0} SV</span>
              },
              { key: 'semester', header: 'Học kỳ' },
            ]}
            data={classes}
            keyExtractor={(r) => r.id}
          />
        </div>
      </Card>
    </div>
  )
}