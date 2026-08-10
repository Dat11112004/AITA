import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Aurora, Colors, Type } from '@/constants/theme'

/**
 * The heading above a list block: title on the left, an optional "see all" affordance on the
 * right, and an optional one-line hint underneath.
 *
 * Screens previously rendered a bare <Text> per section, so a section with three rows and a
 * section with thirty looked identical and neither said where the rest of the data lived.
 */
export function SectionHeader({
  title,
  hint,
  actionLabel,
  onAction,
}: {
  title: string
  hint?: string
  actionLabel?: string
  onAction?: () => void
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: a.onGlass }]} numberOfLines={1}>
          {title}
        </Text>
        {hint ? (
          <Text style={[styles.hint, { color: a.onGlassSoft }]} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.action} activeOpacity={0.8} onPress={onAction} accessibilityRole="button">
          <Text style={[styles.actionText, { color: c.primary }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={c.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1, gap: 2 },
  title: { ...Type.title, fontWeight: '800' },
  hint: { ...Type.chip, lineHeight: 15 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  actionText: { ...Type.body, fontWeight: '700' },
})
