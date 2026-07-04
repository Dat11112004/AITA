import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { Send, BellRing, Loader2, CheckCircle2 } from 'lucide-react'

export function AdminNotifications() {
  const [form, setForm] = useState({ title: '', message: '', targetRole: 'ALL', type: 'SYSTEM' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleBroadcast = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tiêu đề và nội dung.')
      return
    }
    
    setIsSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')
    
    try {
      const res = await api.broadcastNotification(form) as any
      setSuccessMsg(`Gửi thông báo thành công! Đã gửi đến ${res.recipientCount} người dùng.`)
      setForm({ ...form, title: '', message: '' })
      
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể gửi thông báo')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Gửi thông báo hệ thống"
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Thông báo' }]}
      />

      <Card className="overflow-hidden border border-slate-100 shadow-md bg-white">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex items-center gap-2">
          <BellRing className="text-brand-500 w-5 h-5 ml-2" />
          <CardHeader title="Soạn thông báo mới" />
        </div>

        <div className="p-6 space-y-6">
          {successMsg && (
            <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 mt-0.5" size={18} />
              <p className="font-medium text-sm">{successMsg}</p>
            </div>
          )}
          
          {errorMsg && (
            <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
              <p className="font-medium text-sm">{errorMsg}</p>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input 
                label="Tiêu đề thông báo" 
                placeholder="Ví dụ: Lịch bảo trì hệ thống" 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
              />
            </div>
            
            <Select 
              label="Đối tượng nhận" 
              options={[
                { value: 'ALL', label: 'Tất cả mọi người' },
                { value: 'LECTURER', label: 'Chỉ Giảng viên' },
                { value: 'STUDENT', label: 'Chỉ Sinh viên' }
              ]}
              value={form.targetRole} 
              onChange={(e) => setForm({ ...form, targetRole: e.target.value })} 
            />
            
            <Select 
              label="Loại thông báo" 
              options={[
                { value: 'SYSTEM', label: 'Thông báo hệ thống' },
                { value: 'MAINTENANCE', label: 'Bảo trì' },
                { value: 'REMINDER', label: 'Nhắc nhở' },
                { value: 'ALERT', label: 'Cảnh báo khẩn cấp' }
              ]}
              value={form.type} 
              onChange={(e) => setForm({ ...form, type: e.target.value })} 
            />
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung chi tiết</label>
              <Textarea 
                placeholder="Nhập nội dung chi tiết của thông báo..." 
                value={form.message} 
                onChange={(e) => setForm({ ...form, message: e.target.value })} 
                rows={6} 
                className="w-full rounded-md border border-slate-300 p-3 text-sm focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              className="px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium flex items-center gap-2"
              onClick={handleBroadcast}
              disabled={isSubmitting}
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : <><Send size={16} /> Gửi thông báo</>}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
