import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Platform, useColorScheme } from 'react-native'

import { Aurora, Colors, Layout } from '@/constants/theme'
import { useNotifications } from '@/store/NotificationsContext'

/**
 * Student area — bottom tabs.
 *
 * Five destinations now, so the label size drops a step: at 12px "Thông báo" no longer fits
 * a fifth of the pill and was being clipped mid-word.
 */
export default function StudentLayout() {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]
  const { unread } = useNotifications()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: a.onGlassSoft,
        // Aurora Glass: a floating frosted pill with a soft coloured glow.
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
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.1 },
        tabBarBadgeStyle: { backgroundColor: c.danger, fontSize: 10, lineHeight: 13, minWidth: 18, height: 18 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          tabBarLabel: t('tabs.assignments'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          tabBarLabel: t('tabs.learning'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'library' : 'library-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          tabBarLabel: t('tabs.results'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'ribbon' : 'ribbon-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarLabel: t('tabs.notifications'),
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
