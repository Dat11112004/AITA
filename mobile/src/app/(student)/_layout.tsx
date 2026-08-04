import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Platform, useColorScheme } from 'react-native'

import { Aurora, Colors, Layout } from '@/constants/theme'

// Student area (v1) — bottom tabs. "Trang chủ" = dashboard; "Bài tập" = assignments stack.
// Add more tabs (AI feedback, notifications) in later phases.
export default function StudentLayout() {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

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
        // Vertical padding stays small: the item's own 5pt inset plus a 24pt icon already
        // eat most of the bar. At paddingVertical:12 the label box measured 8px against
        // ~14px of text and was clipped to nothing.
        tabBarItemStyle: { height: Layout.tabBarHeight, paddingVertical: 8 },
        // Figma: 12/700 active, 12/400 inactive, 0.03em tracking.
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.36 },
        // The Figma has no filled header bar — screens open straight onto the ground.
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          headerShown: false, // greeting is the header, per the Figma
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
