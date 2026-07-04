import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { Brand } from '@/constants/theme'

// Assignments stack (inside the "Bài tập" tab): list (index) → detail ([id]).
export default function AssignmentsLayout() {
  const { t } = useTranslation()
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Brand[600] },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('assignments.title') }} />
      <Stack.Screen name="[id]" options={{ title: t('assignment.detailTitle') }} />
    </Stack>
  )
}
