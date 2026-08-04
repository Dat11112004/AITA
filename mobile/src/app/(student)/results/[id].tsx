import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { InlineToast } from '@/components/PrimaryButton'
import { ScreenHeader } from '@/components/ScreenHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Aurora, Colors, Layout, Radius, Type } from '@/constants/theme'
import { api, ApiError, type SubmissionRow } from '@/lib/api'
import { formatDue } from '@/lib/countdown'

const fmt = (v: number | null | undefined): string => (v === null || v === undefined ? '—' : String(v))

/**
 * One submission's result.
 *
 * The score is shown as the arithmetic the backend actually performed —
 * `rawScore − latePenaltyAmount = finalScore` — rather than a single number, because a
 * student who was docked for a late submission deserves to see why the figure moved.
 *
 * Note the publication gate: `SubmissionResponseDto` nulls every score, the AI feedback and
 * the instructor feedback until `reviewStatus === 'PUBLISHED'`. So a null here means "not
 * released yet", never "zero", and the UI has to say so instead of rendering 0.
 *
 * Per-rubric-rule AI hints are not reachable from mobile: `GetAiHintUseCase` needs a
 * `ruleScoreId` and `/submissions/:id` does not expose the rule scores. Stated in the UI
 * rather than silently omitted.
 */
export default function SubmissionResultScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [sub, setSub] = useState<SubmissionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSub(await api.getSubmission(String(id)))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <AuroraBackground>
        <Loading />
      </AuroraBackground>
    )
  }
  if (error || !sub) {
    return (
      <AuroraBackground>
        <ErrorView message={error ?? t('common.notFound')} onRetry={load} />
      </AuroraBackground>
    )
  }

  const published = sub.isPublished === true || sub.finalScore !== null || sub.totalScore !== null
  const penalty = sub.latePenaltyAmount ?? null
  const finalScore = sub.finalScore ?? sub.score ?? sub.totalScore ?? null

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScreenHeader title={t('results.detailTitle')} fallback="/(student)/results" />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: a.onGlass }]} numberOfLines={3}>
            {sub.assignmentTitle ?? sub.exam?.title ?? '—'}
          </Text>
          <View style={styles.metaRow}>
            <StatusBadge status={sub.status} />
            {sub.className ? (
              <Text style={[styles.meta, { color: a.onGlassSoft }]} numberOfLines={1}>
                {sub.className}
              </Text>
            ) : null}
          </View>

          {!published ? <InlineToast text={t('results.notPublished')} tone="info" /> : null}

          {/* score breakdown */}
          <Text style={[styles.section, { color: a.onGlass }]}>{t('results.breakdown')}</Text>
          <GlassCard strong style={styles.block}>
            <View style={styles.line}>
              <Text style={[styles.lineLabel, { color: a.onGlassSoft }]}>{t('results.rawScore')}</Text>
              <Text style={[styles.lineValue, { color: a.onGlass }]}>{fmt(sub.rawScore ?? sub.totalScore)}</Text>
            </View>
            <View style={styles.line}>
              <Text style={[styles.lineLabel, { color: a.onGlassSoft }]}>{t('results.penalty')}</Text>
              <Text style={[styles.lineValue, { color: penalty ? c.danger : a.onGlass }]}>
                {penalty ? `− ${penalty}` : fmt(penalty)}
              </Text>
            </View>
            <View style={[styles.line, styles.total, { borderTopColor: a.glassBorder }]}>
              <Text style={[styles.lineLabel, styles.totalLabel, { color: a.onGlass }]}>{t('results.finalScore')}</Text>
              <Text style={[styles.totalValue, { color: c.primary }]}>{fmt(finalScore)}</Text>
            </View>

            {sub.isLate ? (
              <View style={[styles.flag, { backgroundColor: c.warningBg }]}>
                <Ionicons name="time-outline" size={15} color={c.warningFg} />
                <Text style={[styles.flagText, { color: c.warningFg }]}>
                  {t('results.late', { count: sub.daysLate ?? 1 })}
                </Text>
              </View>
            ) : null}
            {sub.isReopened ? (
              <View style={[styles.flag, { backgroundColor: c.infoBg }]}>
                <Ionicons name="refresh-outline" size={15} color={c.infoFg} />
                <Text style={[styles.flagText, { color: c.infoFg }]}>{t('results.reopened')}</Text>
              </View>
            ) : null}

            <View style={[styles.line, { borderTopWidth: 1, borderTopColor: a.glassBorder, paddingTop: 10 }]}>
              <Text style={[styles.lineLabel, { color: a.onGlassSoft }]}>{t('lecturer.submittedAt')}</Text>
              <Text style={[styles.lineValue, { color: a.onGlass }]} numberOfLines={1}>
                {sub.submittedAt ? formatDue(sub.submittedAt) : t('lecturer.notSubmitted')}
              </Text>
            </View>
            {sub.gradedAt ? (
              <View style={styles.line}>
                <Text style={[styles.lineLabel, { color: a.onGlassSoft }]}>{t('results.gradedAt')}</Text>
                <Text style={[styles.lineValue, { color: a.onGlass }]} numberOfLines={1}>
                  {formatDue(sub.gradedAt)}
                </Text>
              </View>
            ) : null}
          </GlassCard>

          {/* AI feedback */}
          <Text style={[styles.section, { color: a.onGlass }]}>{t('results.aiFeedback')}</Text>
          <GlassCard style={styles.block}>
            <View style={styles.blockHead}>
              <Ionicons name="sparkles-outline" size={16} color={c.primary} />
              <Text style={[styles.blockLabel, { color: a.onGlassSoft }]}>AI</Text>
            </View>
            <Text style={[styles.prose, { color: sub.aiFeedback ? a.onGlass : a.onGlassSoft }]}>
              {sub.aiFeedback ?? t('results.noAiFeedback')}
            </Text>
            <Text style={[styles.footnote, { color: a.onGlassSoft }]}>{t('results.perRuleLimit')}</Text>
          </GlassCard>

          {/* lecturer feedback */}
          <Text style={[styles.section, { color: a.onGlass }]}>{t('results.lecturerFeedback')}</Text>
          <GlassCard style={styles.block}>
            <View style={styles.blockHead}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={c.primary} />
              <Text style={[styles.blockLabel, { color: a.onGlassSoft }]}>{t('lecturer.role')}</Text>
            </View>
            <Text style={[styles.prose, { color: sub.instructorFeedback ? a.onGlass : a.onGlassSoft }]}>
              {sub.instructorFeedback ?? t('results.noLecturerFeedback')}
            </Text>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 60, gap: 10 },
  title: { ...Type.greeting, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  meta: { ...Type.body },
  section: { ...Type.title, fontWeight: '800', marginTop: 12 },
  block: { gap: 10 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  blockLabel: { ...Type.chip, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lineLabel: { ...Type.body, fontWeight: '600' },
  lineValue: { ...Type.bodyLg, fontWeight: '700' },
  total: { borderTopWidth: 1, paddingTop: 10, marginTop: 2 },
  totalLabel: { ...Type.bodyLg, fontWeight: '800' },
  totalValue: { fontSize: 26, lineHeight: 30, fontWeight: '800' },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderRadius: Radius.md },
  flagText: { ...Type.body, fontWeight: '600', flex: 1 },
  prose: { ...Type.bodyLg, lineHeight: 23 },
  footnote: { ...Type.chip, marginTop: 2 },
})
