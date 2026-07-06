import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { api, type SubjectRow } from '@/lib/api'
import { Plus, Library, TableProperties, Loader2, X, AlertTriangle, CheckSquare } from 'lucide-react'

export function AdminSubjects() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectRow | null>(null)
  const [form, setForm] = useState<{ code: string; name: string; description: string }>({ code: '', name: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  // Selection Mode
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.getSubjects()
      setSubjects(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách môn học'
      setLoadError(msg)
      setSubjects([])
      console.error('Failed to load subjects:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      if (editingSubject) {
        await api.updateSubject(editingSubject.id, {
          code: form.code,
          name: form.name,
          description: form.description,
        })
      } else {
        await api.createSubject({
          code: form.code,
          name: form.name,
          description: form.description,
        })
      }
      setForm({ code: '', name: '', description: '' })
      setEditingSubject(null)
      setShowForm(false)
      load()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Tạo môn học thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (subject: SubjectRow) => {
    setEditingSubject(subject)
    setForm({
      code: subject.code,
      name: subject.name || '',
      description: subject.description || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá môn học này?')) return
    try {
      await api.deleteSubject(id)
      setSubjects(prev => prev.filter(s => s.id !== id))
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Xoá thất bại')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Bạn có chắc chắn muốn xoá ${selectedIds.size} môn học đã chọn?`)) return
    setIsDeleting(true)
    try {
      const results = await Promise.allSettled(Array.from(selectedIds).map(id => api.deleteSubject(id)))
      const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
      if (failed.length > 0) {
        alert(failed.map(f => f.reason.message || 'Lỗi').join('\n'))
      }
      setSubjects(prev => prev.filter(s => !selectedIds.has(s.id)))
      setSelectedIds(new Set())
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Xóa hàng loạt thất bại')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Quản lý Môn học"
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Môn học' }]}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={selectionMode ? 'primary' : 'outline'}
              className={selectionMode ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'text-slate-700 dark:text-slate-300 border-slate-200'}
              onClick={() => {
                setSelectionMode(!selectionMode)
                if (selectionMode) {
                  setSelectedIds(new Set())
                }
              }}
            >
              <CheckSquare size={16} className="mr-2" /> {selectionMode ? 'Hủy chọn' : 'Chọn'}
            </Button>
            {selectionMode && (
              <Button
                size="sm"
                variant="outline"
                className="text-brand-700 border-brand-200 hover:bg-brand-50"
                onClick={() => {
                  if (selectedIds.size === subjects.length && subjects.length > 0) {
                    setSelectedIds(new Set())
                  } else {
                    setSelectedIds(new Set(subjects.map(s => s.id)))
                  }
                }}
              >
                {selectedIds.size === subjects.length && subjects.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (showForm) {
                  setShowForm(false)
                  setEditingSubject(null)
                  setForm({ code: '', name: '', description: '' })
                } else {
                  setShowForm(true)
                }
              }}
              variant={showForm ? 'secondary' : 'primary'}
              className="shadow-sm transition-all duration-200 flex items-center gap-2"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? 'Đóng form' : 'Tạo môn học mới'}
            </Button>
          </div>
        }
      />

      {showForm && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <Library className="text-brand-500 w-5 h-5 ml-2" />
            <CardHeader title={editingSubject ? `Chỉnh sửa môn học: ${editingSubject.code}` : "Tạo môn học mới"} />
          </div>

          <div className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              <Input label="Mã môn" placeholder="Ví dụ: PRJ301" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <Input label="Tên môn" placeholder="Ví dụ: Java Web Development" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Mô tả" placeholder="Nhập mô tả ngắn gọn..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

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
                  'Lưu thông tin môn học'
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
            <p className="text-slate-600 dark:text-slate-400 font-medium">Đang tải danh sách môn học...</p>
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

      {/* Subjects List */}
      {!loading && !loadError && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableProperties className="text-slate-500 w-5 h-5 ml-2" />
              <CardHeader title="Danh sách môn học" />
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                  <span className="text-sm font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full">
                    Đã chọn: {selectedIds.size}
                  </span>
                  {selectedIds.size === 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const id = Array.from(selectedIds)[0]
                        const subj = subjects.find(s => s.id === id)
                        if (subj) handleEdit(subj)
                      }}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      Sửa
                    </Button>
                  )}
                  <Button size="sm" onClick={handleBulkDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white border-none shadow-sm">
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Xóa đã chọn
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="p-2 overflow-x-auto custom-scrollbar">
            <DataTable
              columns={[
                ...(selectionMode ? [{
                  key: 'select',
                  header: '',
                  render: (r: SubjectRow) => {
                    const subj = r;
                    return (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(subj.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedIds(prev => {
                            const next = new Set(prev)
                            if (checked) next.add(subj.id)
                            else next.delete(subj.id)
                            return next
                          })
                        }}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    )
                  },
                  className: 'w-10 text-center'
                }] : []),
                {
                  key: 'code',
                  header: 'Mã môn',
                  render: (r: SubjectRow) => <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{r.code}</span>
                },
                { key: 'name', header: 'Tên môn học' },

                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (r: SubjectRow) => {
                    const status = r.status
                    const isActive = status === 'active' || status === '1' || status === 'true' || !status
                    return (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {isActive ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    )
                  }
                },
                {
                  key: 'actions',
                  header: '',
                  render: (r: SubjectRow) => (
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => {
                        if (selectedIds.size === 1) {
                          const id = Array.from(selectedIds)[0]
                          const subj = subjects.find(s => s.id === id)
                          if (subj) handleEdit(subj)
                        } else {
                          handleEdit(r)
                        }
                      }}>
                        Chỉnh sửa
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => {
                        if (selectedIds.size > 0) {
                          handleBulkDelete()
                        } else {
                          handleDelete(r.id)
                        }
                      }}>
                        Xoá
                      </Button>
                    </div>
                  )
                }
              ] as any}
              data={subjects}
              keyExtractor={(r) => r.id}
              onRowClick={selectionMode ? (row) => {
                setSelectedIds(prev => {
                  const next = new Set(prev)
                  if (next.has(row.id)) next.delete(row.id)
                  else next.add(row.id)
                  return next
                })
              } : undefined}
            />
          </div>
        </Card>
      )}
    </div>
  )
}
