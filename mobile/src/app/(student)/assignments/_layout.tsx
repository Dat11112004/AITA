import { Stack } from 'expo-router'
import { useColorScheme } from 'react-native'

import { Aurora } from '@/constants/theme'

// Assignments stack (inside the "Bài tập" tab): list (index) → detail ([id]).
// Aurora Glass: the list renders its own header; the detail floats a transparent
// header (just the back chevron) over the aurora ground.
export default function AssignmentsLayout() {
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
