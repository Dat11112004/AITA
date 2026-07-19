import { Stack } from 'expo-router'
import { useColorScheme } from 'react-native'

import { Aurora } from '@/constants/theme'

// Lecturer classes stack: list (index) → class detail ([id]).
export default function LecturerClassesLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const a = Aurora[scheme]

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: a.onGlass,
        headerShadowVisible: false,
        headerTitle: '',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" />
    </Stack>
  )
}
