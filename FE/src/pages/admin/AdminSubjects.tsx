import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { api, type SubjectRow, type CreateSubjectBody } from '@/lib/api'
import { Plus, Pencil, Trash2, BookOpen, AlertTriangle, Code, GraduationCap, FileText, Loader2, X } from 'lucide-react'

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Cơ bản' },
  { value: 'intermediate', label: 'Trung bình' },
  { value: 'advanced', label: 'Nâng cao' },
]

const emptyForm: CreateSubjectBody = { code: '', name: '', difficulty: 'intermediate', description: '', codeExamples: '', curriculum: '' }

export function AdminSubjects() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SubjectRow | null>(null)
  const [form, setForm] = useState<CreateSubjectBody>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = () => {
    api.getSubjects().then(setSubjects).catch(console.error)
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setForm({ ...emptyForm })
    setEditing(null)
    setShowForm(false)
    setError('')
  }

  const handleEdit = (row: SubjectRow) => {
    setEditing(row)
    setForm({ code: row.code, name: row.name, difficulty: row.difficulty, description: row.description, codeExamples: row.codeExamples ?? '', curriculum: row.curriculum ?? '' })
    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.code || !form.name) { setError('Mã và tên môn học là bắt buộc'); return }

    setSaving(true)
    try {
      if (editing) {
        await api.updateSubject(editing.id, form)
      } else {
        await api.createSubject(form)
      }
      resetForm()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu dữ liệu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSubject(id)
      setConfirmDelete(null)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Xóa thất bại')
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <PageHeader
        title="Ngân hàng môn học"
        description="Quản lý danh mục môn học, chương trình đào tạo và cấu trúc dữ liệu bổ trợ cho AI Engine."
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Ngân hàng môn học' }]}
        actions={
          <Button
            size="sm"
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center gap-2 active:scale-95 transition-transform"
            onClick={() => { resetForm(); setShowForm(true) }}
          >
            <Plus size={16} />
            Thêm môn học mới
          </Button>
        }
      />

      {/* Thông báo xác nhận xóa (Hộp cảnh báo nổi bật) */}
      {confirmDelete && (
        <Card className="border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10 p-4 shadow-sm animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-600 dark:text-red-400 w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300 text-sm">Xác nhận xóa môn học khỏi cơ sở dữ liệu?</p>
                <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">Tất cả cấu trúc bài tập và dữ liệu chấm AI liên quan có thể bị ảnh hưởng. Hành động này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setConfirmDelete(null)}>Hủy bỏ</Button>
              <Button size="sm" onClick={() => handleDelete(confirmDelete)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-4">Đồng ý Xóa</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Form thêm/sửa môn học */}
      {showForm && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex justify-between items-center">
            <CardHeader title={editing ? `Cập nhật thông tin: ${editing.code}` : 'Khởi tạo môn học mới'} />
            <button type="button" onClick={resetForm} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div><span className="font-semibold">Lỗi nhập liệu:</span> {error}</div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Mã môn học" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Ví dụ: PRF192, PRO192" required />
              <Input label="Tên môn học chính thức" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: Programming Fundamentals" required />
              <Select label="Mức độ khó mặc định" options={DIFFICULTY_OPTIONS} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} />
              <Input label="Chương trình đào tạo (Curriculum)" value={form.curriculum ?? ''} onChange={(e) => setForm({ ...form, curriculum: e.target.value })} placeholder="Ví dụ: SE, AI, Safe-IoT (Ngăn cách dấu phẩy)" />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <FileText size={14} />
                <span>Nội dung & Dữ liệu huấn luyện AI</span>
              </div>
              <Textarea label="Mô tả tóm tắt môn học" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Mô tả mục tiêu môn học giúp AI định hình khung bài tập..." />

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Code size={14} className="text-brand-500" />
                  <span className="font-medium">Mẫu mã nguồn / Cú pháp chuẩn (C/C++, Java, Python...)</span>
                </div>
                <Textarea value={form.codeExamples ?? ''} onChange={(e) => setForm({ ...form, codeExamples: e.target.value })} rows={5} className="font-mono text-xs bg-slate-950 text-slate-200 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-800 focus:border-brand-500" placeholder="// Cung cấp snippet code chuẩn để AI Engine chấm khớp cú pháp mong muốn..." />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <Button type="button" variant="ghost" className="text-slate-500 hover:bg-slate-50" onClick={resetForm}>Hủy bỏ</Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-brand-600 hover:bg-brand-700 text-white px-5 min-w-[110px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editing ? 'Cập nhật môn' : 'Tạo môn học'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Danh sách ngân hàng môn học */}
      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <GraduationCap className="text-slate-500 w-5 h-5 ml-2" />
          <CardHeader title="Danh mục môn học trong hệ thống" />
        </div>

        <div className="p-2">
          <DataTable
            columns={[
              {
                key: 'code',
                header: 'Mã môn',
                render: (r) => <span className="font-mono font-bold text-xs tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200/60 dark:border-slate-700/50 text-slate-700 dark:text-slate-300">{(r as SubjectRow).code}</span>,
                className: 'w-28 pl-4'
              },
              {
                key: 'name',
                header: 'Tên môn học',
                render: (r) => (
                  <div className="flex items-center gap-2.5 py-1">
                    <div className="p-1.5 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-lg shrink-0">
                      <BookOpen size={15} />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{(r as SubjectRow).name}</span>
                  </div>
                )
              },
              {
                key: 'difficulty',
                header: 'Mức độ',
                render: (r) => {
                  const d = (r as SubjectRow).difficulty
                  const v = d === 'beginner' ? 'success' : d === 'advanced' ? 'danger' : 'warning'
                  const l = d === 'beginner' ? 'Cơ bản' : d === 'advanced' ? 'Nâng cao' : 'Trung bình'
                  return <Badge variant={v} className="px-2 py-0.5 rounded-full font-medium shadow-none text-[11px]">{l}</Badge>
                },
                className: 'w-28'
              },
              {
                key: 'curriculum',
                header: 'Chương trình',
                render: (r) => <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{(r as SubjectRow).curriculum || '—'}</span>,
                className: 'w-32'
              },
              {
                key: 'description',
                header: 'Mô tả vắn tắt',
                render: (r) => (
                  <span className="text-slate-500 dark:text-slate-400 text-xs max-w-xs block truncate" title={(r as SubjectRow).description}>
                    {(r as SubjectRow).description || 'Chưa có mô tả môn học.'}
                  </span>
                )
              },
              {
                key: 'actions',
                header: 'Thao tác',
                render: (r) => {
                  const s = r as SubjectRow
                  return (
                    <div className="flex gap-1 pr-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition"
                        title="Sửa môn học"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(s.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition"
                        title="Xóa môn học"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                },
                className: 'w-24 text-right'
              },
            ]}
            data={subjects}
            keyExtractor={(r) => r.id}
          />
        </div>
      </Card>
    </div>
  )
}