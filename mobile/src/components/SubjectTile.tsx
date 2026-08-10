import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { gradientForSubject, GradientDirection, Radius, tint, Type } from '@/constants/theme'

/**
 * Subject tile, Aurora Glass style: a subject-coloured gradient card with a soft
 * matching glow, a translucent-glass icon chip, and a left-aligned code + name.
 *
 * Two densities. The plain tile (no `badge`, no `footer`) is the original compact card and
 * is what the dashboards use. Passing either prop switches to the taller layout Học tập
 * needs, where a tile also carries the class code and a per-subject roll-up — the compact
 * one has no room for them without truncating the subject name to nothing.
 */
export function SubjectTile({
  subject,
  caption,
  badge,
  footer,
  onPress,
}: {
  subject: string
  caption?: string
  /** Secondary code shown top-right, e.g. the class code on a subject tile. */
  badge?: string
  /** One-line roll-up under a divider, e.g. "3 bài tập · 1 sắp hạn". */
  footer?: string
  onPress?: () => void
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const [from, to] = gradientForSubject(subject)
  const rich = !!(badge || footer)

  const gradient = (children: React.ReactNode) => (
    <View style={[styles.glow, { shadowColor: from }, scheme === 'dark' && { shadowOpacity: 0.5 }]}>
      <LinearGradient
        colors={[from, to]}
        start={GradientDirection.start}
        end={GradientDirection.end}
        locations={GradientDirection.locations}
        style={rich ? styles.tileRich : styles.tile}
      >
        {children}
      </LinearGradient>
    </View>
  )

  const body = rich
    ? gradient(
        <>
          <View style={styles.topRow}>
            <View style={styles.iconChipRich}>
              <Ionicons name="book" size={16} color="#FFFFFF" />
            </View>
            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.bottom}>
            <Text style={styles.label} numberOfLines={1}>
              {subject}
            </Text>
            {caption ? (
              <Text style={styles.caption} numberOfLines={2}>
                {caption}
              </Text>
            ) : null}
            {footer ? (
              <View style={styles.footer}>
                <Text style={styles.footerText} numberOfLines={1}>
                  {footer}
                </Text>
              </View>
            ) : null}
          </View>
        </>,
      )
    : gradient(
        <>
          <View style={styles.iconChip}>
            <Ionicons name="book" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {subject}
          </Text>
          {caption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </>,
      )

  if (!onPress) return <View style={styles.wrap}>{body}</View>
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.88} onPress={onPress}>
      {body}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 0, flexBasis: '48%' },
  glow: {
    borderRadius: Radius.card,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tile: {
    minHeight: 92,
    borderRadius: Radius.card,
    padding: 16,
    justifyContent: 'flex-end',
    gap: 3,
    overflow: 'hidden',
  },
  tileRich: {
    minHeight: 142,
    borderRadius: Radius.card,
    padding: 14,
    justifyContent: 'space-between',
    gap: 10,
    overflow: 'hidden',
  },
  iconChip: {
    position: 'absolute',
    top: 12,
    left: 14,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: tint('#FFFFFF', 0.22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipRich: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: tint('#FFFFFF', 0.22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  badge: {
    backgroundColor: tint('#FFFFFF', 0.24),
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '62%',
  },
  badgeText: { ...Type.chip, fontSize: 10.5, color: '#FFFFFF', fontWeight: '700' },
  bottom: { gap: 3 },
  label: { ...Type.title, color: '#FFFFFF', fontWeight: '700' },
  caption: { ...Type.chip, color: 'rgba(255,255,255,0.85)' },
  footer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.28)',
    paddingTop: 6,
  },
  footerText: { ...Type.chip, fontSize: 11, color: 'rgba(255,255,255,0.95)', fontWeight: '600' },
})
