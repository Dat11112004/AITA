import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api, type NotificationRow } from '@/lib/api'
import { Bell, Calendar, Mail, AlertCircle, Info, CheckCircle } from 'lucide-react'

export function StudentNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getNotifications({ scope: 'student' })
      .then(setNotifications)
      .finally(() => setLoading(false))
  }, [])

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id)
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'deadline': return <Calendar size={18} className="text-amber-500 dark:text-amber-400" />
      case 'grade': return <CheckCircle size={18} className="text-emerald-500 dark:text-emerald-400" />
      case 'urgent': return <AlertCircle size={18} className="text-red-500 dark:text-red-400" />
      default: return <Info size={18} className="text-blue-500 dark:text-blue-400" />
    }
  }

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen">
      <PageHeader
        title="Thông báo & Nhắc nhở"
        description="Cập nhật tin tức khóa học, nhắc nhở thời hạn nộp bài và kết quả chấm điểm tức thì (FE-S-08)."
        breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Thông báo' }]}
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-4">
           <Card className="bg-brand-600 dark:bg-brand-500 text-white border-0 shadow-lg shadow-brand-500/20">
              <div className="flex justify-between items-start pt-4 px-4">
                 <Bell size={24} className="text-brand-200 dark:text-brand-100" />
                 <Badge variant="neutral" className="bg-white/20 text-white border-0">
                    {notifications.filter(n => !n.read).length} Mới
                 </Badge>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold">Hộp thư AITA</h3>
                <p className="text-xs text-brand-100 mt-1">Đừng bỏ lỡ các thông tin quan trọng từ giảng viên và hệ thống.</p>
              </div>
           </Card>
           
           <Card>
              <CardHeader title="Bộ lọc" />
              <div className="space-y-2 p-4 sm:p-6 pt-0">
                 <button className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-700">
                    Tất cả thông báo
                 </button>
                 <button className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 transition">
                    Chưa đọc
                 </button>
                 <button className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 transition">
                    Kết quả học tập
                 </button>
              </div>
           </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="border border-slate-200/80 dark:border-slate-800 h-full">
            <CardHeader title="Danh sách thông báo" />
            <div className="p-4 sm:p-6 pt-0">
              {loading ? (
                <div className="py-20 text-center text-slate-400 dark:text-slate-500">Đang kiểm tra thông báo...</div>
              ) : notifications.length === 0 ? (
                <div className="py-20 text-center">
                   <Mail size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                   <p className="text-slate-500 dark:text-slate-400">Hộp thư của bạn đang trống.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`group relative flex gap-4 p-4 rounded-xl transition cursor-pointer border ${n.read ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/50 opacity-70' : 'bg-slate-50 dark:bg-slate-800/50 border-brand-100 dark:border-brand-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm'}`}
                      onClick={() => !n.read && markRead(n.id)}
                    >
                      <div className="mt-1 shrink-0 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 h-fit">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className={`text-sm font-bold truncate pr-4 ${n.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>{n.title}</h4>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{new Date(n.createdAt).toLocaleDateString('vi')}</span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed line-clamp-2 ${n.read ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                          {n.message}
                        </p>
                      </div>
                      {!n.read && (
                         <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(243,112,33,0.8)]" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
