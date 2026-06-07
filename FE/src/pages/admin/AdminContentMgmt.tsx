import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { api, type ContentRow, type CreateContentBody } from '@/lib/api'
import { Plus, Pencil, Trash2, Eye, FileText, Layout, X, AlertCircle, Calendar, User } from 'lucide-react'

const CATEGORY_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'article', label: 'Bài viết' },
  { id: 'news', label: 'Tin tức' },
  { id: 'announcement', label: 'Thông báo' },
  { id: 'guide', label: 'Hướng dẫn' },
]

const CATEGORY_OPTIONS = [
  { value: 'article', label: 'Bài viết' },
  { value: 'news', label: 'Tin tức' },
  { value: 'announcement', label: 'Thông báo' },
  { value: 'guide', label: 'Hướng dẫn' },
]

const emptyForm: CreateContentBody = { title: '', category: 'article', body: '', status: 'draft', publishAt: null }

export function AdminContentMgmt() {
  const [tab, setTab] = useState('all')
  const [contents, setContents] = useState<ContentRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ContentRow | null>(null)
  const [form, setForm] = useState<CreateContentBody>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ContentRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = () => {
    const params: Record<string, string> = {}
    if (tab !== 'all') params.category = tab
    api.getContents(params).then(setContents).catch(console.error)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const resetForm = () => {
    setForm({ ...emptyForm })
    setEditing(null)
    setShowForm(false)
    setError('')
  }

  const handleEdit = (row: ContentRow) => {
    setEditing(row)
    setForm({ title: row.title, category: row.category, body: row.body, status: row.status === 'archived' ? 'draft' : row.status, publishAt: row.publishAt ?? null })
    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title || !form.body) { setError('Tiêu đề và nội dung là bắt buộc'); return }

    setSaving(true)
    try {
      if (editing) {
        await api.updateContent(editing.id, form)
      } else {
        await api.createContent(form)
      }
      resetForm()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu nội dung')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteContent(id)
      setConfirmDelete(null)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Xóa thất bại')
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Quản lý nội dung"
        description="Bài viết, tin tức, thông báo và hướng dẫn sử dụng trên nền tảng AITA."
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Nội dung' }]}
        actions={
          <Button
            size="sm"
            onClick={() => { resetForm(); setShowForm(!showForm) }}
            className={`shadow-sm transition-all duration-200 flex items-center gap-2 ${showForm
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Đóng bộ đơn' : 'Tạo nội dung'}
          </Button>
        }
      />

      {/* Form Tạo/Sửa Nội Dung */}
      {showForm && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <FileText className="text-brand-500 w-5 h-5 ml-2" />
            <CardHeader title={editing ? `Chỉnh sửa: ${editing.title}` : 'Tạo nội dung mới'} />
          </div>

          <form onSubmit={handleSave} className="p-6">
            {error && (
              <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div><span className="font-semibold">Lỗi dữ liệu:</span> {error}</div>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <Input label="Tiêu đề" placeholder="Nhập tiêu đề bài viết..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <Select label="Danh mục" options={CATEGORY_OPTIONS} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Select
                label="Trạng thái"
                options={[
                  { value: 'draft', label: 'Bản nháp' },
                  { value: 'published', label: 'Xuất bản' },
                ]}
                value={form.status ?? 'draft'}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}
              />
              <Input label="Lên lịch xuất bản" type="datetime-local" value={form.publishAt ?? ''} onChange={(e) => setForm({ ...form, publishAt: e.target.value || null })} />
            </div>

            <Textarea label="Nội dung" placeholder="Viết nội dung chi tiết tại đây..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} className="mt-6" required />

            <div className="mt-6 flex gap-2 justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button type="button" variant="ghost" onClick={resetForm} className="rounded-lg">Hủy</Button>
              <Button type="submit" disabled={saving} className="bg-brand-600 hover:bg-brand-700 text-white px-6">
                {saving ? 'Đang xử lý...' : editing ? 'Cập nhật nội dung' : 'Tạo mới'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Khu vực Xem trước (Preview) */}
      {preview && (
        <Card className="overflow-hidden border border-amber-200 dark:border-amber-900/60 shadow-lg bg-amber-50/10 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-amber-50/40 dark:bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="text-amber-500 w-5 h-5 ml-2" />
              <CardHeader title={`Xem trước: ${preview.title}`} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)} className="h-8 w-8 p-0 rounded-full">
              <X size={16} />
            </Button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <Badge variant="info">{preview.category}</Badge>
              <Badge variant={preview.status === 'published' ? 'success' : 'neutral'}>
                {preview.status === 'published' ? 'Đã xuất bản' : preview.status}
              </Badge>
            </div>
            <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
              {preview.body}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="flex items-center gap-1"><User size={13} /> Tác giả: {preview.author}</span>
              <span className="flex items-center gap-1"><Calendar size={13} /> Cập nhật: {new Date(preview.updatedAt).toLocaleString('vi')}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Xác nhận Xóa chuyên nghiệp */}
      {confirmDelete && (
        <Card className="border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 w-6 h-6 shrink-0" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-400">Bạn chắc chắn muốn xóa nội dung này chứ?</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Hành động này không thể hoàn tác sau khi đã thực hiện.</p>
              </div>
            </div>
            <div className="flex gap-2 self-end sm:self-auto">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)} className="hover:bg-slate-100">Bỏ qua</Button>
              <Button size="sm" onClick={() => handleDelete(confirmDelete)} className="bg-red-600 hover:bg-red-700 text-white px-4">Xác nhận Xóa</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Khối Danh Sách Nội Dung Chính */}
      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <Layout className="text-slate-500 w-5 h-5 ml-2" />
          <CardHeader title="Danh sách bài viết & thông báo" />
        </div>

        <div className="p-4">
          {/* Hệ thống Tabs phân loại */}
          <div className="mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Tabs items={CATEGORY_TABS} activeId={tab} onChange={setTab} />
          </div>

          {/* DataTable dữ liệu */}
          <div className="overflow-x-auto custom-scrollbar">
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Tiêu đề',
                  render: (r) => <span className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1 max-w-sm">{(r as ContentRow).title}</span>
                },
                {
                  key: 'category',
                  header: 'Danh mục',
                  render: (r) => <Badge variant="info" className="capitalize">{(r as ContentRow).category}</Badge>
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (r) => {
                    const s = (r as ContentRow).status
                    return (
                      <Badge variant={s === 'published' ? 'success' : s === 'archived' ? 'neutral' : 'warning'}>
                        {s === 'published' ? 'Đã xuất bản' : s === 'archived' ? 'Lưu trữ' : 'Bản nháp'}
                      </Badge>
                    )
                  }
                },
                { key: 'author', header: 'Tác giả' },
                {
                  key: 'updatedAt',
                  header: 'Cập nhật',
                  render: (r) => <span className="text-sm text-slate-500 whitespace-nowrap">{new Date((r as ContentRow).updatedAt).toLocaleDateString('vi')}</span>
                },
                {
                  key: 'actions',
                  header: '',
                  render: (r) => {
                    const c = r as ContentRow
                    return (
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => setPreview(c)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all" title="Xem nhanh">
                          <Eye size={16} />
                        </button>
                        <button type="button" onClick={() => handleEdit(c)} className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 hover:text-brand-600 transition-all" title="Sửa nội dung">
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(c.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 transition-all" title="Xóa">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  }
                },
              ]}
              data={contents}
              keyExtractor={(r) => r.id}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}