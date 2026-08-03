import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Platform, useColorScheme } from 'react-native'

import { Aurora, Colors, Layout } from '@/constants/theme'
import { useNotifications } from '@/store/NotificationsContext'

// Lecturer area — bottom tabs: Home (dashboard), Classes, Grading.
// Same Aurora Glass floating tab bar as the student area.
export default function LecturerLayout() {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]
  const { unread } = useNotifications()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: a.onGlassSoft,
        tabBarStyle: {
          position: 'absolute',
          left: Layout.screenPad,
          right: Layout.screenPad,
          bottom: Platform.select({ ios: 24, default: 16 }),
          height: Layout.tabBarHeight,
          borderRadius: Layout.tabBarRadius,
          backgroundColor: a.glassStrong,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: a.glassBorder,
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: '#4B3F86',
          shadowOpacity: scheme === 'dark' ? 0.55 : 0.2,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 16,
        },
        tabBarItemStyle: { height: Layout.tabBarHeight, paddingVertical: 8, paddingHorizontal: 2 },
        // Four tabs now: 12px clipped "Thông báo" mid-word, so the label steps down a size.
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
        tabBarBadgeStyle: { backgroundColor: c.danger, fontSize: 10, lineHeight: 13, minWidth: 18, height: 18 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: t('lecturer.tabs.home'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          tabBarLabel: t('lecturer.tabs.classes'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'school' : 'school-outline'} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="grading"
        options={{
          tabBarLabel: t('lecturer.tabs.grading'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'checkmark-done-circle' : 'checkmark-done-circle-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarLabel: t('lecturer.tabs.notifications'),
          // Undefined (not 0) hides the badge entirely — a "0" bubble reads as unread mail.
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}
