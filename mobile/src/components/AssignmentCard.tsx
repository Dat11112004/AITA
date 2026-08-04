import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Aurora, Colors, gradientForSubject, Layout, Type } from '@/constants/theme'
import type { AssignmentRow } from '@/lib/api'
import { countdownTo } from '@/lib/countdown'

import { GlassCard } from './GlassCard'
import { StatusBadge } from './StatusBadge'
import { SubjectChip } from './SubjectChip'

/**
 * Assignment card, Aurora Glass style: a frosted card with a subject-coloured
 * gradient accent down the left edge, the title, and a meta row pairing the
 * subject chip with a countdown. `variant="grid"` is the dashboard's compact
 * two-up tile; `variant="row"` is the full-width list item with status + chevron.
 */
export function AssignmentCard({
  assignment,
  onPress,
  variant = 'row',
}: {
  assignment: AssignmentRow
  onPress?: () => void
  variant?: 'row' | 'grid'
}) {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]
  const grid = variant === 'grid'
  const cd = countdownTo(assignment.due)
  const closed = (assignment.status ?? '').toUpperCase() === 'CLOSED'
  const urgent = !!cd?.urgent && !closed
  const accent = gradientForSubject(assignment.class)

  const body = (
    <GlassCard style={[styles.card, grid ? styles.grid : null]}>
      {/* subject-coloured accent stripe */}
      <LinearGradient
        colors={accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.accent}
      />

      <View style={styles.inner}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: a.onGlass }]} numberOfLines={2}>
            {assignment.title}
          </Text>
          {!grid ? <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} /> : null}
        </View>

        <View style={styles.metaRow}>
          {assignment.class ? <SubjectChip subject={assignment.class} /> : null}
          {!grid && assignment.status ? <StatusBadge status={assignment.status} /> : null}
          {cd ? (
            <View style={[styles.cd, urgent && { backgroundColor: c.dangerBg }]}>
              <Ionicons name="time-outline" size={13} color={urgent ? c.danger : a.onGlassSoft} />
              <Text style={[styles.cdText, { color: urgent ? c.danger : a.onGlassSoft }]}>{cd.label}</Text>
            </View>
          ) : (
            <Text style={[styles.cdText, { color: a.onGlassSoft }]}>{t('assignment.noDue')}</Text>
          )}
        </View>
      </View>
    </GlassCard>
  )

  const Wrapper = onPress ? TouchableOpacity : View
  return (
    <Wrapper {...(onPress ? { activeOpacity: 0.85, onPress } : {})} style={grid ? styles.gridWrap : undefined}>
      {body}
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  card: { paddingLeft: Layout.cardPad + 6 },
  grid: { minHeight: Layout.pendingHeight, justifyContent: 'center' },
  gridWrap: { flexGrow: 0, flexBasis: '48%' },
  // Rounded pill inset from the edges so it reads cleanly without the card clipping its content.
  accent: { position: 'absolute', left: 7, top: 14, bottom: 14, width: 5, borderRadius: 3 },
  inner: { gap: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, ...Type.title, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cd: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  cdText: { ...Type.body, fontWeight: '600' },
})
