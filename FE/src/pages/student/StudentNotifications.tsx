import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Bell, Check, Clock, Info, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export function StudentNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    let alive = true
    setLoading(true)
    api.getNotifications(1, 50)
      .then(res => {
        if (alive) setNotifications(Array.isArray(res) ? res : (res?.data || []))
      })
      .catch(err => console.error(err))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const cleanup = loadData()
    return cleanup
  }, [loadData])

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Thông báo"
          description="Nhận thông báo bài tập, nhắc nhở deadline và thông báo từ hệ thống."
          breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Thông báo' }]}
        />
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <Check size={16} className="text-brand-500" />
            Đánh dấu đã đọc tất cả
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {notifications.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center">
            <Bell size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
            <p>Bạn không có thông báo nào.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map(n => {
              const isDeadline = n.type === 'DEADLINE_WARNING' || n.title.toLowerCase().includes('hạn') || n.title.toLowerCase().includes('deadline')
              const isSystem = n.type === 'SYSTEM' || n.title.toLowerCase().includes('hệ thống')

              return (
                <div 
                  key={n.id} 
                  className={`flex flex-col sm:flex-row justify-between p-5 transition-colors ${!n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isDeadline ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' :
                      isSystem ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                      'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                    }`}>
                      {isDeadline ? <AlertTriangle size={20} /> : isSystem ? <Info size={20} /> : <Bell size={20} />}
                    </div>
                    <div>
                      <h4 className={`font-bold text-base mb-1 ${!n.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                        {n.title}
                      </h4>
                      <p className={`text-sm leading-relaxed ${!n.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-2">
                        <Clock size={12} />
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex shrink-0">
                    {!n.read && (
                      <button 
                        onClick={() => handleMarkAsRead(n.id)}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1"
                      >
                        <Check size={14} /> Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
