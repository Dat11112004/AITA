import '@/lib/i18n'

import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider, useAuth } from '@/store/AuthContext'

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
      // `profile` is a shared authed screen outside the role groups — don't bounce it.
      if (group !== target && group !== 'profile') router.replace(`/${target}/dashboard` as any)
    } else if (status === 'guest' && group !== 'login') {
      router.replace('/login' as any)
    }
  }, [status, user, segments, router])

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
