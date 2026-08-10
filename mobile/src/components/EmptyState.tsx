import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Aurora, Colors, Radius, tint, Type } from '@/constants/theme'

import { GlassCard } from './GlassCard'

/**
 * The "nothing here yet" card.
 *
 * Every empty branch used to be a single line of grey text floating on the gradient, which
 * reads as a screen that failed rather than one with nothing to show. A card of roughly the
 * same height as a populated row keeps the layout intact and has room to say *why* it is
 * empty and what to do next.
 */
export function EmptyState({
  icon = 'sparkles-outline',
  title,
  hint,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  hint?: string
  actionLabel?: string
  onAction?: () => void
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.icon, { backgroundColor: tint(c.primary, scheme === 'dark' ? 0.22 : 0.12) }]}>
        <Ionicons name={icon} size={22} color={c.primary} />
      </View>
      <Text style={[styles.title, { color: a.onGlass }]}>{title}</Text>
      {hint ? <Text style={[styles.hint, { color: a.onGlassSoft }]}>{hint}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: c.primarySoft, borderColor: tint(c.primary, 0.35) }]}
          activeOpacity={0.85}
          onPress={onAction}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaText, { color: c.primary }]}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={14} color={c.primary} />
        </TouchableOpacity>
      ) : null}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, paddingVertical: 26 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  title: { ...Type.bodyLg, fontWeight: '700', textAlign: 'center' },
  hint: { ...Type.body, lineHeight: 19, textAlign: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 6,
  },
  ctaText: { ...Type.body, fontWeight: '700' },
})
