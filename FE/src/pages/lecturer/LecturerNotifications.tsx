import React, { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
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
      setMsg({ text: 'Vui lòng điền đầy đủ thông tin và chọn lớp đích.', type: 'error' })
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
    <div className="space-y-8 p-1 selection:bg-brand-500 selection:text-white min-h-screen bg-slate-50/50 dark:bg-slate-900/50">

      {/* Premium Studio Page Header */}
      <div className="relative rounded-2xl overflow-hidden bg-[#07090e] text-white p-2 border border-white/[0.08] dark:border-white/[0.05] shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative pr-2">
          <PageHeader
            title="Thông báo & Nhắc nhở"
            description="Gửi tin nhắn tức thì, nhắc nhở deadline và thông báo kết quả cho sinh viên các lớp bạn đang phụ trách (FE-A-05)."
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Thông báo' }]}
            actions={
              <Button
                size="sm"
                onClick={() => setShowForm(!showForm)}
                className="font-bold tracking-wide shadow-[0_4px_12px_rgba(243,112,33,0.2)] bg-slate-950 dark:bg-brand-500 hover:bg-brand-600 border-0 transition-all duration-200"
              >
                <Bell size={14} className="mr-1.5 animate-bounce" /> Gửi thông báo
              </Button>
            }
          />
        </div>
      </div>

      {/* Modern Status Feedback Toast Layout */}
      {msg.text && (
        <div className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${msg.type === 'success'
          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
          : 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20 dark:border-red-500/30 text-red-700 dark:text-red-400'
          }`}>
          <Info size={14} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase">[{msg.type === 'success' ? 'SUCCESS' : 'ERROR'}]:</span> {msg.text}
          </div>
        </div>
      )}

      {/* Advanced Drawer/Form Composer Area */}
      {showForm && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <CardHeader title="Soạn thông báo mới" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
              <Megaphone size={13} />
            </div>
          </div>

          <form onSubmit={handleSend} className="p-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Lớp nhận thông báo"
                options={classes}
                value={form.targetClassId || ''}
                onChange={(e) => setForm({ ...form, targetClassId: e.target.value })}
                required
              />
              <Select
                label="Loại thông báo"
                options={NOTIF_TYPES}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </div>

            <Input
              label="Tiêu đề"
              placeholder="VD: Nhắc nhở nộp bài Assignment 1"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <Textarea
              label="Nội dung chi tiết"
              placeholder="Nhập nội dung thông báo cho sinh viên..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              required
            />

            <div className="flex gap-2 pt-2 justify-end border-t border-slate-100 dark:border-slate-800">
              {/* Giữ nguyên nút mặc định không chứa variant bừa bãi */}
              <Button
                type="submit"
                disabled={sending}
                className="h-9 px-4 rounded-xl bg-slate-950 dark:bg-brand-500 font-bold text-white text-xs hover:bg-brand-600 transition-all duration-200 flex items-center gap-1.5 border-none"
              >
                <Send size={12} />
                <span>{sending ? 'Đang gửi...' : 'Gửi ngay'}</span>
              </Button>

              {/* Giữ nguyên variant="ghost" gốc */}
              <Button
                variant="ghost"
                type="button"
                onClick={() => setShowForm(false)}
                className="h-9 px-4 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-all duration-200"
              >
                Hủy
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Main Notification Audit Trail Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          {/* Giữ nguyên variant="neutral" gốc bảo vệ core */}
          <CardHeader
            title="Lịch sử thông báo"
            action={<Badge variant="neutral" className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px] px-2.5 py-0.5 rounded-md">{history.length} đã gửi</Badge>}
          />
        </div>

        {/* Studio Core DataTable Viewport */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          <DataTable
            columns={[
              {
                key: 'title',
                header: 'Tiêu đề',
                render: (r: any) => (
                  <div className="py-1 max-w-xs sm:max-w-md">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight block truncate">{r.title}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 block truncate">{r.message?.slice(0, 60)}...</span>
                  </div>
                )
              },
              {
                key: 'type',
                header: 'Loại',
                render: (r: any) => (
                  <div className="py-1">
                    {/* Giữ nguyên hệ thống variant gốc: danger, warning, info */}
                    <Badge variant={r.type === 'urgent' ? 'danger' : r.type === 'deadline' ? 'warning' : 'info'} className="font-medium text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      {NOTIF_TYPES.find(t => t.value === r.type)?.label || r.type}
                    </Badge>
                  </div>
                )
              },
              {
                key: 'target',
                header: 'Gửi đến lớp',
                render: (r: any) => (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 py-1">
                    <Users size={13} className="text-slate-400 dark:text-slate-500" />
                    <span>{r.target}</span>
                  </div>
                )
              },
              {
                key: 'createdAt',
                header: 'Thời gian',
                render: (r: any) => (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono py-1">
                    <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
                    <span>{new Date(r.createdAt).toLocaleString('vi')}</span>
                  </div>
                )
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: () => (
                  <div className="py-1">
                    {/* Giữ nguyên variant="success" gốc */}
                    <Badge variant="success" className="font-medium text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      Hoàn thành
                    </Badge>
                  </div>
                )
              }
            ]}
            data={history}
            keyExtractor={(r) => r.id}
            emptyDescription="Bạn chưa gửi thông báo nào cho các lớp học."
          />

          {/* Empty Fallback State Area */}
          {history.length === 0 && (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900/40 my-2">
              <Inbox size={28} className="mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5] mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Hộp thư rỗng</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-light mt-1">Bạn chưa gửi thông báo nào cho các lớp học hiện hành.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}