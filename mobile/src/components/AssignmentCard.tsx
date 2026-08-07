import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Aurora, Colors, gradientForSubject, Layout, tint, Type } from '@/constants/theme'
import type { AssignmentRow } from '@/lib/api'
import { countdownTo, formatDue } from '@/lib/countdown'

import { Avatar } from './Avatar'
import { GlassCard } from './GlassCard'
import { StatusBadge } from './StatusBadge'
import { SubjectChip } from './SubjectChip'

/**
 * Assignment card, Aurora Glass style: a frosted card with a subject-coloured
 * gradient accent down the left edge, the title, and a meta row pairing the
 * subject chip with a countdown.
 *
 * Three densities, because the same row has to work in three places:
 *   `grid`  — the compact two-up tile (title + chip + countdown only)
 *   `row`   — the dashboard's short list: adds the absolute due date
 *   `full`  — the Bài tập list: adds the brief, the points/weight footer and the lecturer
 *
 * `full` exists because the list endpoint already returns `description`, `maxScore`,
 * `weightPercentage` and `lecturer` on every row — the card was showing three of a dozen
 * fields, which is most of why the list screen looked like it had no data in it.
 */
export function AssignmentCard({
  assignment,
  onPress,
  variant = 'row',
}: {
  assignment: AssignmentRow
  onPress?: () => void
  variant?: 'row' | 'grid' | 'full'
}) {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]
  const grid = variant === 'grid'
  const full = variant === 'full'
  const cd = countdownTo(assignment.due)
  const closed = (assignment.status ?? '').toUpperCase() === 'CLOSED'
  const urgent = !!cd?.urgent && !closed
  const accent = gradientForSubject(assignment.class)

  const brief = full ? (assignment.description ?? '').trim() : ''
  const score = assignment.maxScore != null && assignment.maxScore !== '' ? String(assignment.maxScore) : null
  const weight = typeof assignment.weightPercentage === 'number' ? assignment.weightPercentage : null
  const dueText = assignment.due ? formatDue(assignment.due) : null

  const meta: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = []
  if (dueText) meta.push({ icon: 'calendar-outline', text: t('assignments.dueAt', { value: dueText }) })
  if (full && score) meta.push({ icon: 'ribbon-outline', text: t('assignments.scoreUnit', { score }) })
  if (full && weight !== null) meta.push({ icon: 'pie-chart-outline', text: t('assignments.weightUnit', { value: weight }) })

  const body = (
    <GlassCard style={[styles.card, grid ? styles.grid : null]}>
      {/* subject-coloured accent stripe */}
      <LinearGradient colors={accent} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.accent} />

      <View style={styles.inner}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: a.onGlass }]} numberOfLines={grid ? 2 : 3}>
            {assignment.title}
          </Text>
          {!grid ? <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} /> : null}
        </View>

        {brief ? (
          <Text style={[styles.brief, { color: a.onGlassSoft }]} numberOfLines={2}>
            {brief}
          </Text>
        ) : null}

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

        {!grid && meta.length > 0 ? (
          <View style={[styles.footer, { borderTopColor: tint(a.onGlassSoft, 0.18) }]}>
            {meta.map((m) => (
              <View key={m.icon} style={styles.metaItem}>
                <Ionicons name={m.icon} size={13} color={a.onGlassSoft} />
                <Text style={[styles.metaText, { color: a.onGlassSoft }]} numberOfLines={1}>
                  {m.text}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {full && assignment.lecturer ? (
          <View style={styles.lecturer}>
            <Avatar name={assignment.lecturer} uri={assignment.lecturerAvatar} size={22} />
            <Text style={[styles.metaText, { color: a.onGlassSoft }]} numberOfLines={1}>
              {assignment.lecturer}
            </Text>
          </View>
        ) : null}
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
  brief: { ...Type.body, lineHeight: 19, marginTop: -2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cd: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  cdText: { ...Type.body, fontWeight: '600' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, paddingTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { ...Type.chip, lineHeight: 15, fontWeight: '600' },
  lecturer: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: -2 },
})
