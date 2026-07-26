import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Bell, Check, Clock, Info, AlertTriangle, Loader2, ExternalLink, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
  referenceId?: string
  referenceType?: string
}

export function StudentNotifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'assignment' | 'deadline'>('all')

  const loadData = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true)
    api.getNotifications(1, 50)
      .then(res => {
        setNotifications(Array.isArray(res) ? res : (res?.data || []))
      })
      .catch(err => console.error(err))
      .finally(() => { if (showLoading) setLoading(false) })
  }, [])

  useEffect(() => {
    loadData(true)
    const interval = setInterval(() => {
      loadData(false)
    }, 10000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      await api.markNotificationAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá tất cả thông báo không?')) return
    try {
      await api.deleteAllNotifications()
      setNotifications([])
    } catch (err) {
      console.error(err)
    }
  }

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      handleMarkAsRead(n.id)
    }
    const targetId = n.referenceId || n.ReferenceId
    if (targetId) {
      navigate(`/student/assignments/${targetId}`)
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
  const assignmentCount = notifications.filter(n => n.type === 'ASSIGNMENT' || n.title.toLowerCase().includes('bài tập')).length
  const deadlineCount = notifications.filter(n => n.type === 'DEADLINE_WARNING' || n.title.toLowerCase().includes('hạn') || n.title.toLowerCase().includes('deadline')).length

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.read
    if (activeTab === 'assignment') return n.type === 'ASSIGNMENT' || n.title.toLowerCase().includes('bài tập')
    if (activeTab === 'deadline') return n.type === 'DEADLINE_WARNING' || n.title.toLowerCase().includes('hạn') || n.title.toLowerCase().includes('deadline')
    return true
  })

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Thông báo"
          description="Nhận thông báo bài tập, nhắc nhở deadline và thông báo từ hệ thống."
          breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Thông báo' }]}
        />
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <Check size={16} className="text-brand-500" />
              Đánh dấu đã đọc tất cả
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm font-medium text-red-600 dark:text-red-400 shadow-sm"
            >
              <Trash2 size={16} />
              Xoá tất cả thông báo
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-white dark:bg-[#151821] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Tất cả
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
            {notifications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('unread')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'unread'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-white dark:bg-[#151821] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Chưa đọc
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'unread' ? 'bg-white/20 text-white' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 font-extrabold'}`}>
            {unreadCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('assignment')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'assignment'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-white dark:bg-[#151821] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Bài tập mới
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'assignment' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'}`}>
            {assignmentCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('deadline')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'deadline'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-white dark:bg-[#151821] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Hạn nộp & Cảnh báo
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'deadline' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'}`}>
            {deadlineCount}
          </span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {filteredNotifications.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center">
            <Bell size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
            <p>Không có thông báo nào trong mục này.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotifications.map(n => {
              const isDeadline = n.type === 'DEADLINE_WARNING' || n.title.toLowerCase().includes('hạn') || n.title.toLowerCase().includes('deadline')
              const isSystem = n.type === 'SYSTEM' || n.title.toLowerCase().includes('hệ thống')
              const targetId = n.referenceId || (n as any).ReferenceId

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex flex-col sm:flex-row justify-between p-5 transition-colors cursor-pointer group ${!n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDeadline ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' :
                        isSystem ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                      }`}>
                      {isDeadline ? <AlertTriangle size={20} /> : isSystem ? <Info size={20} /> : <Bell size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-bold text-base ${!n.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                          {n.title}
                        </h4>
                        {targetId && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <ExternalLink size={12} /> Xem bài tập
                          </span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed mt-1 ${!n.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-2">
                        <Clock size={12} />
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex shrink-0 items-center gap-2">
                    {!n.read && (
                      <button onClick={(e) => handleMarkAsRead(n.id, e)} title="Đánh dấu đã đọc" className="p-2 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg">
                        <Check size={18} />
                      </button>
                    )}
                    <button onClick={(e) => handleDeleteOne(n.id, e)} title="Xoá thông báo" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                      <Trash2 size={18} />
                    </button>
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
