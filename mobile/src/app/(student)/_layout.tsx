import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'react-native'

import { Brand, Colors } from '@/constants/theme'

// Student area (v1) — bottom tabs. "Trang chủ" = dashboard; "Bài tập" = assignments stack.
// Add more tabs (AI feedback, notifications) in later phases.
export default function StudentLayout() {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand[600],
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: { backgroundColor: c.background, borderTopColor: c.backgroundSelected },
        headerStyle: { backgroundColor: Brand[600] },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('appName'),
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          headerShown: false,
          tabBarLabel: t('tabs.assignments'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}
