import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Platform, useColorScheme } from 'react-native'

import { Aurora, Colors, Layout } from '@/constants/theme'

// Lecturer area — bottom tabs: Home (dashboard), Classes, Grading.
// Same Aurora Glass floating tab bar as the student area.
export default function LecturerLayout() {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

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
        tabBarItemStyle: { height: Layout.tabBarHeight, paddingVertical: 8 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.36 },
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
    </Tabs>
  )
}
