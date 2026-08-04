import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, useColorScheme, View } from 'react-native'

import { Colors, Radius, tint, Type } from '@/constants/theme'

// Maps an assignment/submission status (UPPERCASE from BE) → a semantic tone.
// Tones, not literal hexes: the previous version hard-coded light-mode pastels that
// never consulted the colour scheme, so every badge glared on the dark ground.
type Tone = 'success' | 'neutral' | 'warning' | 'info' | 'danger'

const TONE: Record<string, Tone> = {
  // exam/assignment statuses
  PUBLISHED: 'success',
  CLOSED: 'neutral',
  DRAFT: 'warning',
  PENDING_AI_REVIEW: 'info', // "AI is working on it" reads as in-progress, not as a warning
  // submission grading statuses
  GRADED: 'success',
  PENDING: 'warning',
  QUEUED: 'info',
  GRADING: 'info',
  ERROR: 'danger',
  REVIEWED: 'success',
}

export function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]

  const key = (status ?? '').toUpperCase()
  const tone = TONE[key] ?? 'neutral'
  const pair: Record<Tone, { bg: string; fg: string }> = {
    success: { bg: c.successBg, fg: c.successFg },
    neutral: { bg: c.neutralBg, fg: c.neutralFg },
    warning: { bg: c.warningBg, fg: c.warningFg },
    info: { bg: c.infoBg, fg: c.infoFg },
    danger: { bg: c.dangerBg, fg: c.dangerFg },
  }
  const { bg, fg } = pair[tone]
  const label = t(`status.${key}`, { defaultValue: status ?? '—' })

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: tint(fg, 0.25) }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  // Matches the Figma chip geometry: pill, 4×6 padding.
  badge: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: { ...Type.chip, fontWeight: '700' },
})
