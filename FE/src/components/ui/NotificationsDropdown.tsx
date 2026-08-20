import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell, BellOff, Check, CheckCheck, Loader2, Trash2, ChevronRight,
  ClipboardList, MessageSquare, Award, Megaphone, CalendarClock, RotateCcw,
} from 'lucide-react'
import { api } from '@/lib/api'
import { emitNotificationEvent, subscribeNotificationEvents } from '@/lib/notifications'

/** Icon + accent colour per notification type, so the list is scannable at a glance. */
function visualsFor(type: string) {
  switch ((type || '').toUpperCase()) {
    case 'ASSIGNMENT':
      return { Icon: ClipboardList, tone: 'text-brand-600 bg-brand-100 dark:text-brand-300 dark:bg-brand-900/40' }
    case 'GRADE_PUBLISHED':
      return { Icon: Award, tone: 'text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40' }
    case 'FEEDBACK':
      return { Icon: MessageSquare, tone: 'text-violet-600 bg-violet-100 dark:text-violet-300 dark:bg-violet-900/40' }
    case 'CLASS_ANNOUNCEMENT':
      return { Icon: Megaphone, tone: 'text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/40' }
    case 'DEADLINE':
    case 'REMINDER':
    case 'DEADLINE_WARNING':
      return { Icon: CalendarClock, tone: 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40' }
    case 'ASSIGNMENT_REOPENED':
      return { Icon: RotateCcw, tone: 'text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/40' }
    default:
      return { Icon: Bell, tone: 'text-slate-500 bg-slate-100 dark:text-slate-300 dark:bg-slate-800' }
  }
}

export function NotificationsDropdown() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmClear(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    try {
      const data = await api.getNotifications()
      setNotifications(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Lỗi tải thông báo', e)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications(true)
    const unsubscribe = subscribeNotificationEvents(() => fetchNotifications(false))
    return unsubscribe
  }, [fetchNotifications])

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, read: true } : n))
    try {
      await api.markNotificationAsRead(id)
      emitNotificationEvent()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      await api.deleteNotification(id)
      emitNotificationEvent()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteAll = async () => {
    setConfirmClear(false)
    setNotifications([])
    try {
      await api.deleteAllNotifications()
      emitNotificationEvent()
    } catch (e) {
      console.error(e)
    }
  }

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead && !n.read) {
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true, read: true } : item))
      api.markNotificationAsRead(n.id).catch(console.error)
      emitNotificationEvent()
    }
    setOpen(false)
    const refId = n.referenceId || n.ReferenceId
    const refType = (n.referenceType || n.ReferenceType || n.type || '').toUpperCase()
    const nType = (n.type || '').toUpperCase()
    const title = (n.title || n.Title || '').toLowerCase()

    if (refId) {
      const isStudent = window.location.pathname.startsWith('/student')
      if (refType === 'CLASS' || refType === 'CLASS_ANNOUNCEMENT' || nType === 'CLASS_ANNOUNCEMENT' || nType === 'CLASS' || title.includes('thông báo lớp')) {
        navigate(isStudent ? `/student/classes/${refId}` : `/lecturer/classes/${refId}`)
      } else if (refType === 'SUBMISSION' || nType === 'FEEDBACK') {
        navigate(isStudent ? `/student/grading/result/${refId}` : `/lecturer/grading/result/${refId}`)
      } else {
        navigate(isStudent ? `/student/assignments/${refId}` : `/lecturer/grading/assignments/${refId}`)
      }
    }
  }

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })))
    try {
      await api.markAllNotificationsAsRead()
      emitNotificationEvent()
    } catch (e) {
      console.error(e)
    }
  }

  const timeAgo = (value?: string) => {
    if (!value) return ''
    const then = new Date(value).getTime()
    if (Number.isNaN(then)) return ''
    const mins = Math.floor((Date.now() - then) / 60000)
    if (mins < 1) return t('notif.just_now')
    if (mins < 60) return t('notif.minutes_ago', { n: mins })
    if (mins < 1440) return t('notif.hours_ago', { n: Math.floor(mins / 60) })
    if (mins < 10080) return t('notif.days_ago', { n: Math.floor(mins / 1440) })
    return new Date(value).toLocaleDateString(i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-GB')
  }

  // Newest first, always. The API already sorts on CreatedAt desc, but rows written
  // before CreatedAt was populated everywhere carry no timestamp and would otherwise
  // sit above newer ones here.
  const groups = useMemo(() => {
    const sorted = [...notifications].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const today: any[] = []
    const earlier: any[] = []
    for (const n of sorted) {
      const ts = n.createdAt ? new Date(n.createdAt).getTime() : 0
      ;(ts >= startOfToday.getTime() ? today : earlier).push(n)
    }
    return [
      { key: 'today', label: t('notif.group_today'), items: today },
      { key: 'earlier', label: t('notif.group_earlier'), items: earlier },
    ].filter(g => g.items.length > 0)
  }, [notifications, t])

  const displayUnread = notifications.filter(n => !n.isRead && !n.read).length

  const allPath = window.location.pathname.startsWith('/student')
    ? '/student/notifications'
    : window.location.pathname.startsWith('/lecturer')
      ? '/lecturer/notifications'
      : null

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setConfirmClear(false) }}
        title={t('notif.title')}
        className="
          relative h-9 w-9 flex items-center justify-center rounded-xl
          text-slate-500 hover:bg-slate-100 hover:text-slate-700
          dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200
          transition-all duration-150
        "
      >
        <Bell size={17} />
        {displayUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-extrabold shadow-sm ring-2 ring-white dark:ring-[#0f1117]">
            {displayUnread > 99 ? '99+' : displayUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="
          absolute right-0 top-full mt-2 z-50 w-[22rem]
          rounded-2xl border border-slate-200 bg-white
          shadow-xl shadow-slate-200/60
          dark:border-slate-800 dark:bg-[#161b27]
          dark:shadow-black/40
          overflow-hidden animate-fade-in-up
        ">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
            {confirmClear ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('notif.clear_all_confirm')}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {t('notif.confirm_cancel')}
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    {t('notif.confirm_delete')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{t('notif.title')}</h3>
                  {displayUnread > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-full whitespace-nowrap">
                      {t('notif.new_count', { n: displayUnread })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {displayUnread > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      title={t('notif.mark_all_read')}
                      className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-900/40 transition-colors cursor-pointer"
                    >
                      <CheckCheck size={15} />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => setConfirmClear(true)}
                      title={t('notif.clear_all')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-[22rem] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10 text-brand-500"><Loader2 className="animate-spin" size={22} /></div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <div className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <BellOff size={20} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('notif.empty')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('notif.empty_desc')}</p>
              </div>
            ) : (
              groups.map(group => (
                <div key={group.key}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {group.label}
                  </p>
                  <div className="px-2 pb-1 space-y-0.5">
                    {group.items.map(n => {
                      const isRead = n.isRead || n.read
                      const { Icon, tone } = visualsFor(n.type)
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`
                            relative flex gap-3 p-2.5 pl-3 rounded-xl cursor-pointer group
                            transition-colors
                            ${isRead
                              ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              : 'bg-brand-50/60 hover:bg-brand-50 dark:bg-brand-900/15 dark:hover:bg-brand-900/25'}
                          `}
                        >
                          {!isRead && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-full bg-brand-500" />
                          )}

                          <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${tone}`}>
                            <Icon size={16} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug truncate ${isRead ? 'text-slate-700 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-slate-100'}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{timeAgo(n.createdAt)}</span>
                              {(n.subjectCode || n.classCode) && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {n.classCode || n.subjectCode}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-center gap-1 shrink-0">
                            {!isRead && (
                              <button
                                onClick={(e) => handleMarkAsRead(n.id, e)}
                                title={t('notif.mark_read')}
                                className="text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-brand-100 dark:hover:bg-brand-900/50 rounded-lg cursor-pointer"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDeleteOne(n.id, e)}
                              title={t('notif.delete')}
                              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {allPath && notifications.length > 0 && (
            <button
              onClick={() => { setOpen(false); navigate(allPath) }}
              className="w-full flex items-center justify-center gap-1 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              {t('notif.view_all')}
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
