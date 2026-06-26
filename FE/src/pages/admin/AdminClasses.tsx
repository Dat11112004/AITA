import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow, type Option } from '@/lib/api'
import { Plus, GraduationCap, TableProperties, Loader2, X, AlertTriangle } from 'lucide-react'

export function AdminClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [lecturers, setLecturers] = useState<Option[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', subject: '', semester: 'Spring 2026', campus: '', lecturerId: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.getClasses()
      setClasses(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách lớp học'
      setLoadError(msg)
      setClasses([])
      console.error('Failed to load classes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api.getLecturerOptions()
      .then(setLecturers)
      .catch(() => setLecturers([]))
  }, [load])

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
      setForm({ code: '', name: '', subject: '', semester: 'Spring 2026', campus: '', lecturerId: '' })
      setShowForm(false)
      load()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Tạo lớp thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
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

      {/* Loading State */}
      {loading && (
        <Card className="flex items-center justify-center p-12 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Đang tải danh sách lớp học...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {loadError && (
        <Card className="border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10 p-4 animate-in slide-in-from-top-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400 w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800 dark:text-red-300">Lỗi tải dữ liệu</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{loadError}</p>
            </div>
            <button onClick={load} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm">
              Thử lại
            </button>
          </div>
        </Card>
      )}

      {/* Classes List - Only show when not loading and no error */}
      {!loading && !loadError && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <TableProperties className="text-slate-500 w-5 h-5 ml-2" />
            <CardHeader title="Danh sách lớp học" />
          </div>

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
      )}
    </div>
  )
}