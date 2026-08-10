import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Aurora, Colors, Radius, Type } from '@/constants/theme'

export type NotificationTab = 'inbox' | 'sent'

/**
 * Inbox / Đã gửi as one segmented control.
 *
 * "Đã gửi" used to be a separate pushed screen with its own back arrow, which read as an
 * unrelated page — and it is the only thing a lecturer's notification screen usually has in
 * it, because a broadcast creates recipient rows for the students and never for the sender.
 * Putting both on one screen means the empty inbox is one tap away from the content.
 */
export function NotificationTabs({
  value,
  onChange,
}: {
  value: NotificationTab
  onChange: (next: NotificationTab) => void
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  // No count badges: the sent total is not known until that tab has fetched, and a badge
  // reading "0" next to three sent notifications is worse than no badge. Each tab's own
  // subtitle reports its count once it is showing.
  const items: { key: NotificationTab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: 'inbox', icon: 'mail-outline', label: 'Hộp thư' },
    { key: 'sent', icon: 'paper-plane-outline', label: 'Đã gửi' },
  ]

  return (
    <View style={[styles.wrap, { backgroundColor: a.glass, borderColor: a.glassBorder }]}>
      {items.map((it) => {
        const active = value === it.key
        return (
          <TouchableOpacity
            key={it.key}
            activeOpacity={0.85}
            onPress={() => onChange(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.seg, active && { backgroundColor: c.primary }]}
          >
            <Ionicons name={it.icon} size={15} color={active ? c.onPrimary : a.onGlassSoft} />
            <Text style={[styles.label, { color: active ? c.onPrimary : a.onGlassSoft }]} numberOfLines={1}>
              {it.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.pill,
    padding: 4,
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  label: { ...Type.body, fontWeight: '700' },
})
