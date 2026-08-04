import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, ApiError, type NotificationRow } from '@/lib/api'
import { useAuth } from '@/store/AuthContext'

/**
 * One source of truth for notifications.
 *
 * The tab badge and the list screen both need the same rows; fetching twice would let them
 * disagree (badge says 3 unread, list shows 2). Everything reads from here, and every
 * mutation updates local state optimistically *and* re-reads, so a failed request cannot
 * leave the badge lying.
 */
interface NotificationsState {
  items: NotificationRow[]
  unread: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  remove: (id: string) => Promise<void>
}

const Ctx = createContext<NotificationsState | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (status !== 'authed') return
    setLoading(true)
    setError(null)
    try {
      setItems((await api.getNotifications()) ?? [])
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tải được thông báo')
    } finally {
      setLoading(false)
    }
  }, [status])

  // Load once the session exists, and drop everything on logout so the next user never
  // sees the previous one's notifications flash on screen.
  useEffect(() => {
    if (status === 'authed') {
      refresh()
    } else if (status === 'guest') {
      setItems([])
      setError(null)
    }
  }, [status, refresh])

  const markRead = useCallback(
    async (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      try {
        await api.markNotificationRead(id)
      } catch {
        await refresh() // put the badge back if the server disagreed
      }
    },
    [refresh],
  )

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.markAllNotificationsRead()
    } catch {
      await refresh()
    }
  }, [refresh])

  const remove = useCallback(
    async (id: string) => {
      const before = items
      setItems((prev) => prev.filter((n) => n.id !== id))
      try {
        await api.deleteNotification(id)
      } catch {
        setItems(before)
        throw new Error('delete-failed')
      }
    },
    [items],
  )

  const value = useMemo<NotificationsState>(
    () => ({
      items,
      unread: items.filter((n) => !n.read).length,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
      remove,
    }),
    [items, loading, error, refresh, markRead, markAllRead, remove],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
