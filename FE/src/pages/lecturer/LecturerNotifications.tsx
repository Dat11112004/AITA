import React, { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { api, type Option, type NotificationRow, type SendNotificationBody } from '@/lib/api'
import { Bell, Send, Users, Info, Calendar, Megaphone, Inbox } from 'lucide-react'

const NOTIF_TYPES = [
  { value: 'info', label: 'Thông báo chung' },
  { value: 'deadline', label: 'Nhắc nhở Deadline' },
  { value: 'grade', label: 'Kết quả chấm bài' },
  { value: 'urgent', label: 'Khẩn cấp' },
]

export function LecturerNotifications() {
  const [classes, setClasses] = useState<Option[]>([])
  const [history, setHistory] = useState<NotificationRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<SendNotificationBody>({ title: '', message: '', type: 'info', targetClassId: '' })
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => {
    api.getClassOptions().then(setClasses).catch(console.error)
    api.getNotifications({ scope: 'lecturer' }).then(setHistory).catch(console.error)
  }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.message || !form.targetClassId) {
      setMsg({ text: 'Vui lòng điền đầy đủ thông tin và chọn lớp.', type: 'error' })
      return
    }

    setSending(true)
    try {
      await api.sendNotification({ ...form, targetRole: 'student' })
      setMsg({ text: 'Gửi thông báo thành công!', type: 'success' })
      setShowForm(false)
      setForm({ title: '', message: '', type: 'info', targetClassId: '' })
      api.getNotifications({ scope: 'lecturer' }).then(setHistory)
    } catch (e) {
      setMsg({ text: 'Gửi thất bại. Vui lòng thử lại.', type: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <PageHeader
            title="Thông báo & Nhắc nhở"
            description="Soạn tin nhắn tức thì, nhắc deadline cho các lớp do bạn phụ trách."
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Thông báo' }]}
          />
        </div>
        <div className="flex shrink-0">
          <Button
            size="md"
            onClick={() => setShowForm(!showForm)}
            className="font-bold gap-2 text-white bg-brand-600 hover:bg-brand-700 shadow-sm border-0 transition-transform hover:-translate-y-0.5"
          >
            <Bell size={16} className="animate-bounce" /> Gửi thông báo
          </Button>
        </div>
      </div>

      {/* Toast message display */}
      {msg.text && (
        <div className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-3 shadow-sm animate-in fade-in transition-all ${
          msg.type === 'success'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
          : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
          }`}>
          <Info size={18} className="shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Form Composer */}
      {showForm && (
        <Card padding="none" className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821] animate-in fade-in zoom-in-95 duration-200">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center rounded-xl bg-orange-50 text-brand-600 dark:bg-orange-500/10 dark:text-brand-400 h-9 w-9">
                <Megaphone size={16} strokeWidth={2.5} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Soạn thông báo</h3>
            </div>
          </div>

          <form onSubmit={handleSend} className="p-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Select
                label="Lớp nhận thông báo"
                options={classes}
                value={form.targetClassId || ''}
                onChange={(e) => setForm({ ...form, targetClassId: e.target.value })}
                required
              />
              <Select
                label="Mức độ / Loại thông báo"
                options={NOTIF_TYPES}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </div>
            <Input
              label="Tiêu đề thông báo"
              placeholder="Nhập tiêu đề..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Textarea
              label="Nội dung truyền đạt"
              placeholder="Nhập nội dung đầy đủ..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              className="resize-none"
              required
            />
            <div className="flex gap-3 pt-4 justify-end border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowForm(false)}
                className="font-bold border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={sending}
                className="font-bold bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition-transform gap-2"
              >
                <Send size={14} />
                {sending ? 'Đang gửi...' : 'Gửi hoàn tất'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Audit Trail Card */}
      <Card padding="none" className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821]">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <h3 className="text-base font-bold text-slate-900 dark:text-white">Lịch sử thông báo ({history.length})</h3>
          </div>
        </div>

        <div className="p-6 overflow-x-auto">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-slate-50 p-5 dark:bg-slate-800/50">
                <Inbox size={36} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-200">Chưa có thông báo nào</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Bạn chưa gửi thông báo nào cho sổ liên lạc hệ thống.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Nội dung thông báo',
                  render: (r: any) => (
                    <div className="py-2 max-w-xs sm:max-w-md pr-4">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px] tracking-tight block truncate">{r.title}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 block truncate">{r.message}</span>
                    </div>
                  )
                },
                {
                  key: 'type',
                  header: 'Tính chất',
                  render: (r: any) => (
                    <div className="py-2">
                       <Badge variant={r.type === 'urgent' ? 'danger' : r.type === 'deadline' ? 'warning' : 'info'} className="font-bold text-[10px] uppercase tracking-wider rounded-md border-none px-2 py-1 shadow-sm">
                        {NOTIF_TYPES.find(t => t.value === r.type)?.label || r.type}
                      </Badge>
                    </div>
                  )
                },
                {
                  key: 'target',
                  header: 'Mục tiêu',
                  render: (r: any) => (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 py-2">
                      <Users size={14} className="text-brand-500 dark:text-brand-400" />
                      <span>{r.target}</span>
                    </div>
                  )
                },
                {
                  key: 'createdAt',
                  header: 'Đã gửi lúc',
                  render: (r: any) => (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono py-2">
                      <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                      <span>{new Date(r.createdAt).toLocaleString('vi')}</span>
                    </div>
                  )
                }
              ]}
              data={history}
              keyExtractor={(r) => r.id}
            />
          )}
        </div>
      </Card>
    </div>
  )
}