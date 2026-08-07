import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Aurora, Colors, Layout, tint, Type } from '@/constants/theme'

import { GlassCard } from './GlassCard'

export type StatTileItem = {
  icon: keyof typeof Ionicons.glyphMap
  value: string | number
  label: string
  onPress?: () => void
}

/**
 * A three-up strip of compact glass stat tiles.
 *
 * Every student screen owns a couple of headline counts that used to be either buried in a
 * sentence ("Bạn có 2 bài tập sắp đến hạn") or not shown at all. Lifting them into a fixed
 * band under each screen's title gives the four tabs the same rhythm — title, band, list —
 * and stops a screen from being nothing but a two-item list on an account with little data.
 */
export function StatTiles({ items }: { items: StatTileItem[] }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  return (
    <View style={styles.row}>
      {items.map((s) => {
        const body = (
          <GlassCard style={styles.tile} padded={false}>
            <View style={[styles.icon, { backgroundColor: tint(c.primary, scheme === 'dark' ? 0.22 : 0.12) }]}>
              <Ionicons name={s.icon} size={15} color={c.primary} />
            </View>
            <Text style={[styles.value, { color: a.onGlass }]} numberOfLines={1}>
              {String(s.value)}
            </Text>
            <Text style={[styles.label, { color: a.onGlassSoft }]} numberOfLines={2}>
              {s.label}
            </Text>
          </GlassCard>
        )

        if (!s.onPress) {
          return (
            <View key={s.label} style={styles.cell}>
              {body}
            </View>
          )
        }
        return (
          <TouchableOpacity key={s.label} style={styles.cell} activeOpacity={0.85} onPress={s.onPress} accessibilityRole="button">
            {body}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Layout.gridGap },
  cell: { flex: 1 },
  tile: { flex: 1, padding: 13, gap: 7, minHeight: 98, justifyContent: 'flex-start' },
  icon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  value: { ...Type.title, fontSize: 22, lineHeight: 26, fontWeight: '800' },
  label: { ...Type.chip, lineHeight: 15, fontWeight: '600' },
})
