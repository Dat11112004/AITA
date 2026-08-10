import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Glow, HeroAurora, Layout, Radius, Type } from '@/constants/theme'

/**
 * The dashboard hero — the app's headline number (the student's average score).
 *
 * Aurora Glass redesign: an indigo→violet→pink diagonal gradient with two glossy
 * light blobs and a coloured glow beneath, plus a translucent-glass CTA. The glow
 * lives on an outer wrapper (so it isn't clipped) while the gradient card clips the
 * blobs to its radius.
 */
export function HeroCard({
  value,
  unit,
  caption,
  actionLabel,
  onAction,
}: {
  value: string | number
  unit: string
  caption: string
  actionLabel?: string
  onAction?: () => void
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const grad = HeroAurora[scheme]
  // A placeholder is not a number: an em-dash set at 40px reads as a white bar across the
  // card rather than as "no score yet", so anything unparseable drops a size.
  const placeholder = Number.isNaN(Number(value)) || String(value).trim() === ''

  return (
    <View style={[styles.wrap, Glow.primary]}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* glossy highlights */}
        <View style={styles.blobA} />
        <View style={styles.blobB} />

        <View style={styles.row}>
          <View style={styles.left}>
            <View style={styles.valueRow}>
              <Text style={[styles.value, placeholder && styles.valuePlaceholder]}>{String(value)}</Text>
              <Text style={styles.unit}>{unit}</Text>
            </View>
            <Text style={styles.caption}>{caption}</Text>
          </View>

          {actionLabel ? (
            <TouchableOpacity activeOpacity={0.85} onPress={onAction} style={styles.cta}>
              <Text style={styles.ctaText} numberOfLines={1}>
                {actionLabel}
              </Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.card + 4, marginTop: 4 },
  card: {
    minHeight: Layout.heroHeight,
    borderRadius: Radius.card + 4,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  blobA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    top: -120,
    right: -40,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  blobB: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    bottom: -90,
    left: -30,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  left: { flex: 1, gap: 8 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  value: { ...Type.hero, color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.5 },
  valuePlaceholder: { fontSize: 30, lineHeight: 34, color: 'rgba(255,255,255,0.75)' },
  unit: { ...Type.bodyLg, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginBottom: 4 },
  caption: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.85)' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  ctaText: { ...Type.body, color: '#FFFFFF', fontWeight: '700' },
})
