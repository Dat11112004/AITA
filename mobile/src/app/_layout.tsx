import '@/lib/i18n'

import * as Notifications from 'expo-notifications'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { ReminderData } from '@/lib/push'
import { AuthProvider, useAuth } from '@/store/AuthContext'
import { NotificationsProvider } from '@/store/NotificationsContext'

// Routes reachable while signed in but living outside the two role groups. Without this the
// gate below would bounce the user back to their dashboard the moment they opened one.
const SHARED_AUTHED_GROUPS = new Set(['profile'])
// Routes a signed-out user is allowed to sit on. The password-recovery pair belongs here:
// someone who cannot log in is exactly who needs them.
const GUEST_GROUPS = new Set(['login', 'forgot-password', 'reset-password'])

// Role-based gating: guests go to /login; authed users land in their own area —
// lecturers in (lecturer), everyone else (student; admin has no mobile UI) in (student).
function RootNavigator() {
  const { status, user } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    const group = segments[0]
    if (status === 'authed') {
      const target = user?.role === 'lecturer' ? '(lecturer)' : '(student)'
      if (group !== target && !SHARED_AUTHED_GROUPS.has(group ?? '')) {
        router.replace(`/${target}/dashboard` as any)
      }
    } else if (status === 'guest' && !GUEST_GROUPS.has(group ?? '')) {
      router.replace('/login' as any)
    }
  }, [status, user, segments, router])

  // Tapping a deadline reminder should open the assignment it is about, not just the app.
  useEffect(() => {
    if (Platform.OS === 'web') return
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as ReminderData | undefined
      if (data?.assignmentId) router.push(`/(student)/assignments/${data.assignmentId}` as any)
    })
    return () => sub.remove()
  }, [router])

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationsProvider>
          <RootNavigator />
        </NotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
