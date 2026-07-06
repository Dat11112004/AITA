import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ExamRow, type SubjectRow } from '@/lib/api'
import { Plus, FileSignature, TableProperties, Loader2, X, AlertTriangle } from 'lucide-react'

export function AdminExams() {
  const [exams, setExams] = useState<ExamRow[]>([])
  const [subjects, setSubjects] = useState<{value: string, label: string}[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', subjectId: '', duration: 90, description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.getExams()
      setExams(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách kỳ thi'
      setLoadError(msg)
      setExams([])
      console.error('Failed to load exams:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Tải danh sách môn học cho dropdown
    api.getSubjects().then((res) => {
      if (res) {
        setSubjects(res.map((s: SubjectRow) => ({ value: s.id, label: `${s.code} - ${s.name}` })))
      }
    }).catch(console.error)
  }, [load])

  const handleCreate = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.createExam({
        title: form.title,
        subjectId: form.subjectId,
        duration: Number(form.duration) || 0,
        description: form.description,
      })
      setForm({ title: '', subjectId: '', duration: 90, description: '' })
      setShowForm(false)
      load()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Tạo kỳ thi thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Quản lý Kỳ thi"
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Kỳ thi' }]}
        actions={
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'secondary' : 'primary'}
            className="shadow-sm transition-all duration-200 flex items-center gap-2"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Đóng form' : 'Tạo kỳ thi mới'}
          </Button>
        }
      />

      {showForm && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <FileSignature className="text-brand-500 w-5 h-5 ml-2" />
            <CardHeader title="Thiết lập Kỳ thi mới" />
          </div>

          <div className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              <Input label="Tên kỳ thi" placeholder="Ví dụ: Thi cuối kỳ Spring 2026" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Select label="Môn học" options={subjects} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} />
              <Input label="Thời lượng (Phút)" type="number" value={form.duration.toString()} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} />
              <Input label="Mô tả / Ghi chú" placeholder="Nhập ghi chú cho kỳ thi..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
                  'Lưu thông tin kỳ thi'
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
            <p className="text-slate-600 dark:text-slate-400 font-medium">Đang tải danh sách kỳ thi...</p>
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

      {/* Exams List */}
      {!loading && !loadError && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <TableProperties className="text-slate-500 w-5 h-5 ml-2" />
            <CardHeader title="Danh sách Kỳ thi" />
          </div>

          <div className="p-2 overflow-x-auto custom-scrollbar">
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Tên kỳ thi',
                  render: (r) => <span className="font-bold text-slate-900 dark:text-slate-100">{(r as ExamRow).title}</span>
                },
                { key: 'subject', header: 'Môn học' },
                {
                  key: 'duration',
                  header: 'Thời gian',
                  render: (r) => <span className="font-mono">{(r as ExamRow).duration} phút</span>
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (r) => {
                    const status = (r as ExamRow).status || 'draft'
                    const map: Record<string, { label: string, color: string }> = {
                      draft: { label: 'Bản nháp', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400' },
                      published: { label: 'Đã xuất bản', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
                      ongoing: { label: 'Đang diễn ra', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
                      completed: { label: 'Đã kết thúc', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
                    }
                    const s = map[status] || map.draft
                    return (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    )
                  }
                },
              ]}
              data={exams}
              keyExtractor={(r) => r.id}
            />
          </div>
        </Card>
      )}
    </div>
  )
}
