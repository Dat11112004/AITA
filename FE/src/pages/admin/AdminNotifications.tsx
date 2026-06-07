import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { api, type NotificationRow, type SendNotificationBody, type Option } from '@/lib/api'
import { Bell, Send, Plus, X, AlertTriangle, CheckCircle2, Loader2, Megaphone, History } from 'lucide-react'

const NOTIF_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'deadline', label: 'Deadline' },
  { id: 'grade', label: 'Kết quả' },
  { id: 'info', label: 'Thông báo' },
  { id: 'warning', label: 'Cảnh báo' },
  { id: 'urgent', label: 'Khẩn cấp' },
]

const TYPE_OPTIONS = [
  { value: 'info', label: 'Thông báo chung' },
  { value: 'deadline', label: 'Nhắc deadline' },
  { value: 'grade', label: 'Kết quả chấm bài' },
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'urgent', label: 'Khẩn cấp' },
]

const TARGET_ROLE_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'student', label: 'Sinh viên' },
  { value: 'lecturer', label: 'Giảng viên' },
]

const emptyForm: SendNotificationBody = { title: '', message: '', type: 'info', targetRole: '', targetClassId: '' }

export function AdminNotifications() {
  const [tab, setTab] = useState('all')
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<SendNotificationBody>({ ...emptyForm })
  const [classes, setClasses] = useState<Option[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => {
    const params: Record<string, string> = {}
    if (tab !== 'all') params.type = tab
    api.getNotifications(params).then(setNotifications).catch(console.error)
  }

  useEffect(() => {
    load()
    api.getClassOptions().then(setClasses).catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.title || !form.message) { setError('Tiêu đề và nội dung là bắt buộc'); return }

    setSending(true)
    try {
      await api.sendNotification(form)
      setSuccess('Đã gửi thông báo thành công hệ thống!')
      setTimeout(() => setSuccess(''), 4000)
      setForm({ ...emptyForm })
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi gửi thông báo')
    } finally {
      setSending(false)
    }
  }

  const typeVariant = (t: string) => {
    if (t === 'urgent') return 'danger'
    if (t === 'warning') return 'warning'
    if (t === 'deadline') return 'warning'
    if (t === 'grade') return 'success'
    return 'info'
  }

  const typeLabel = (t: string) => {
    const map: Record<string, string> = { info: 'Thông báo', deadline: 'Deadline', grade: 'Kết quả', warning: 'Cảnh báo', urgent: 'Khẩn cấp' }
    return map[t] ?? t
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Quản lý thông báo"
        description="Gửi và quản lý thông báo cho sinh viên, giảng viên theo lớp hoặc toàn hệ thống."
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Thông báo' }]}
        actions={
          <Button
            size="sm"
            onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
            className={`shadow-sm transition-all duration-200 flex items-center gap-2 ${showForm
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Đóng trình gửi' : 'Gửi thông báo mới'}
          </Button>
        }
      />

      {/* Form Phát Thông Báo Mới */}
      {showForm && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <Megaphone className="text-brand-500 w-5 h-5 ml-2 animate-bounce" />
            <CardHeader title="Gửi thông báo" />
          </div>

          <form onSubmit={handleSend} className="p-6">
            {error && (
              <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4 animate-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div><span className="font-semibold">Lỗi hệ thống:</span> {error}</div>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Tiêu đề" placeholder="Nhập tiêu đề thông báo ngắn gọn..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <Select label="Loại thông báo" options={TYPE_OPTIONS} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              <Select label="Đối tượng nhận" options={TARGET_ROLE_OPTIONS} value={form.targetRole ?? ''} onChange={(e) => setForm({ ...form, targetRole: e.target.value })} />
              <div className="sm:col-span-2">
                <Select label="Lớp học chỉ định (Tùy chọn)" options={[{ value: '', label: 'Áp dụng cho tất cả lớp học' }, ...classes]} value={form.targetClassId ?? ''} onChange={(e) => setForm({ ...form, targetClassId: e.target.value })} />
              </div>
            </div>

            <Textarea label="Nội dung chi tiết" placeholder="Nhập nội dung thông báo gửi đến người dùng..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} className="mt-6" required />

            <div className="mt-6 flex gap-2 justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="rounded-lg">Hủy bỏ</Button>
              <Button
                type="submit"
                variant="accent"
                disabled={sending}
                className="bg-brand-600 hover:bg-brand-700 text-white px-6 font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none active:scale-95"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
                {sending ? 'Đang gửi tin...' : 'Gửi phát đi'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Thông báo thành công đặt bên ngoài form để người dùng thấy khi form đóng */}
      {success && (
        <div className="flex items-start gap-3 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div><span className="font-semibold">Thành công:</span> {success}</div>
        </div>
      )}

      {/* Khối Lịch Sử Gửi Thông Báo */}
      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <History className="text-slate-500 w-5 h-5 ml-2" />
          <CardHeader title="Lịch sử thông báo" action={
            <div className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-medium text-slate-600 dark:text-slate-400">
              <Bell size={14} className="text-brand-500" />
              <span>Tổng số: {notifications.length} bản tin</span>
            </div>
          } />
        </div>

        <div className="p-4">
          {/* Tabs bộ lọc loại thông báo */}
          <div className="mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Tabs items={NOTIF_TABS} activeId={tab} onChange={setTab} />
          </div>

          {/* Bảng dữ liệu DataTable */}
          <div className="overflow-x-auto custom-scrollbar">
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Tiêu đề bản tin',
                  render: (r) => <span className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1 max-w-xs">{(r as NotificationRow).title}</span>
                },
                {
                  key: 'type',
                  header: 'Phân loại',
                  render: (r) => <Badge variant={typeVariant((r as NotificationRow).type)} className="shadow-none">{typeLabel((r as NotificationRow).type)}</Badge>
                },
                {
                  key: 'target',
                  header: 'Đối tượng nhận',
                  render: (r) => {
                    const target = (r as NotificationRow).target || 'Tất cả'
                    return <span className="text-sm text-slate-600 dark:text-slate-300 font-medium capitalize">{target}</span>
                  }
                },
                {
                  key: 'message',
                  header: 'Nội dung vắn tắt',
                  render: (r) => <span className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 max-w-sm">{((r as NotificationRow).message ?? '')}</span>
                },
                {
                  key: 'createdAt',
                  header: 'Thời gian phát',
                  render: (r) => <span className="text-xs text-slate-400 whitespace-nowrap font-mono">{new Date((r as NotificationRow).createdAt).toLocaleString('vi')}</span>
                },
              ]}
              data={notifications}
              keyExtractor={(r) => r.id}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}