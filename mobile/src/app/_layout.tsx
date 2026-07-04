import '@/lib/i18n'

import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider, useAuth } from '@/store/AuthContext'

// Role-based gating (Student v1): redirect to /login when guest, to the student area when authed.
function RootNavigator() {
  const { status } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    const inStudent = segments[0] === '(student)'
    if (status === 'authed' && !inStudent) {
      router.replace('/(student)/dashboard' as any)
    } else if (status === 'guest' && segments[0] !== 'login') {
      router.replace('/login' as any)
    }
  }, [status, segments, router])

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
