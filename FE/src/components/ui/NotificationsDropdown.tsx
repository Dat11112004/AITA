import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, Check, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getNotifications()
      setNotifications(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Lỗi tải thông báo', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.markNotificationAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (e) {
      console.error(e)
    }
  }

  const displayUnread = notifications.length ? notifications.filter(n => !n.isRead).length : 3

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="
          relative h-9 w-9 flex items-center justify-center rounded-xl
          text-slate-500 hover:bg-slate-100 hover:text-slate-700
          dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200
          transition-all duration-150
        "
      >
        <Bell size={17} />
        {displayUnread > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-[1.5px] ring-white dark:ring-[#0f1117]" />
        )}
      </button>

      {open && (
        <div className="
          absolute right-0 top-full mt-2 z-50 w-80
          rounded-2xl border border-slate-200 bg-white
          shadow-xl shadow-slate-200/60
          dark:border-slate-800 dark:bg-[#161b27]
          dark:shadow-black/40
          overflow-hidden animate-fade-in-up
        ">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Thông báo</h3>
            {displayUnread > 0 && (
              <span onClick={handleMarkAllAsRead} className="text-xs text-brand-600 dark:text-brand-400 cursor-pointer hover:underline">Đánh dấu đã đọc tất cả</span>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center p-6 text-brand-500"><Loader2 className="animate-spin" size={24} /></div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-6 text-sm text-slate-500">
                Chưa có thông báo nào.
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map(n => (
                  <div key={n.id} className={`p-3 rounded-xl transition-colors cursor-pointer group ${n.isRead ? 'opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800' : 'bg-brand-50/50 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.isRead ? 'text-slate-700 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-slate-100'}`}>{n.title}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                      {!n.isRead && (
                        <button onClick={(e) => handleMarkAsRead(n.id, e)} className="text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-brand-100 dark:hover:bg-brand-900 rounded-lg">
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
