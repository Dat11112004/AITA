import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { InlineToast } from '@/components/PrimaryButton'
import { StatusBadge } from '@/components/StatusBadge'
import { SubjectChip } from '@/components/SubjectChip'
import { Aurora, Colors, Layout, Radius, Type } from '@/constants/theme'
import { api, ApiError, type AssignmentRow, type SubmissionRow } from '@/lib/api'
import { countdownTo, formatDue } from '@/lib/countdown'
import { DEV_PREVIEW, getMockAssignment } from '@/lib/devPreview'

/**
 * Assignment detail.
 *
 * `ExamResponseDto` carries far more than the title and due date the first version showed —
 * total points, weight, attachments, the rubric rules and the whole late-penalty policy —
 * so all of it is surfaced here. A student deciding whether to rush a submission needs to
 * know what late costs before the deadline, not after.
 *
 * The old screen also had a "Nộp bài" button that only ever printed "coming soon". Mobile
 * is a companion for tracking, not submitting, so that button is gone and the screen says
 * plainly where submission happens.
 */
export default function AssignmentDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
  const [mine, setMine] = useState<SubmissionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (DEV_PREVIEW) {
        const m = id ? getMockAssignment(id) : undefined
        if (!m) throw new Error(t('common.notFound'))
        setAssignment(m)
        setMine(null)
        return
      }

      const detail = await api.getAssignment(String(id))
      setAssignment(detail)

      // A STUDENT caller is narrowed to their own rows server-side, so this returns at most
      // their attempts. Failure here must not take the whole screen down — the brief is
      // still worth reading without it.
      try {
        const subs = await api.getSubmissionsByExam(String(id))
        // Attempts come back newest-first (repository orders by SubmittedAt desc), so the
        // last element is the *oldest* try — taking it showed attempt 1 of a resubmitted
        // paper. Prefer the row the server flags as current, else the newest.
        setMine(subs.find((s) => s.isLatest) ?? subs[0] ?? null)
      } catch {
        setMine(null)
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    load()
  }, [load])

  const openFile = async (url: string) => {
    setFileError(null)
    try {
      await WebBrowser.openBrowserAsync(url)
    } catch {
      setFileError(t('detail.openFileError'))
    }
  }

  if (loading) {
    return (
      <AuroraBackground>
        <Loading />
      </AuroraBackground>
    )
  }
  if (error || !assignment) {
    return (
      <AuroraBackground>
        <ErrorView message={error ?? t('common.notFound')} onRetry={load} />
      </AuroraBackground>
    )
  }

  const item = assignment
  const cd = countdownTo(item.due)
  const attachments = item.attachments ?? []
  const rubrics = item.rubrics ?? []

  // Turn the BE's penalty enum + value into one sentence a student can act on.
  const penaltySentence = (): string => {
    const type = (item.latePenaltyType ?? 'NONE').toUpperCase()
    const value = item.latePenaltyValue ?? 0
    if (type === 'DAILY_POINTS') return t('detail.penaltyDailyPoints', { value })
    if (type === 'DAILY_PERCENT') return t('detail.penaltyDailyPercent', { value })
    if (type === 'FLAT_POINTS') return t('detail.penaltyFlat', { value })
    return t('detail.penaltyNone')
  }

  const facts: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'ribbon-outline', label: t('detail.maxScore'), value: item.maxScore != null ? String(item.maxScore) : '—' },
    { icon: 'pie-chart-outline', label: t('detail.weight'), value: item.weightPercentage != null ? `${item.weightPercentage}%` : '—' },
    { icon: 'pricetag-outline', label: t('detail.type'), value: item.type ?? '—' },
    { icon: 'library-outline', label: t('detail.subject'), value: item.subjectLabel ?? item.class ?? '—' },
  ]

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headSpacer} />

          <Text style={[styles.title, { color: a.onGlass }]}>{item.title}</Text>
          <View style={styles.metaRow}>
            <StatusBadge status={item.status} />
            {item.class ? <SubjectChip subject={item.class} /> : null}
          </View>

          {/* due */}
          <GlassCard style={styles.block}>
            <View style={styles.blockHead}>
              <Ionicons name="calendar-outline" size={16} color={c.primary} />
              <Text style={[styles.label, { color: a.onGlassSoft }]}>{t('assignment.due')}</Text>
            </View>
            <View style={styles.dueRow}>
              <Text style={[styles.value, { color: a.onGlass }]}>
                {item.due ? formatDue(item.due) : t('assignment.noDue')}
              </Text>
              {cd ? (
                <View style={[styles.cd, cd.urgent && { backgroundColor: c.dangerBg }]}>
                  <Ionicons name="time-outline" size={13} color={cd.urgent ? c.danger : a.onGlassSoft} />
                  <Text style={[styles.cdText, { color: cd.urgent ? c.danger : a.onGlassSoft }]}>{cd.label}</Text>
                </View>
              ) : null}
            </View>
          </GlassCard>

          {/* facts */}
          <GlassCard style={styles.block}>
            {facts.map((f, i) => (
              <View key={f.label} style={[styles.factRow, i > 0 && { borderTopWidth: 1, borderTopColor: a.glassBorder }]}>
                <Ionicons name={f.icon} size={16} color={c.primary} />
                <Text style={[styles.factLabel, { color: a.onGlassSoft }]}>{f.label}</Text>
                <Text style={[styles.factValue, { color: a.onGlass }]} numberOfLines={1}>
                  {f.value}
                </Text>
              </View>
            ))}
          </GlassCard>

          {/* my submission */}
          <GlassCard style={styles.block} strong>
            <View style={styles.blockHead}>
              <Ionicons name="cloud-done-outline" size={16} color={c.primary} />
              <Text style={[styles.label, { color: a.onGlassSoft }]}>{t('detail.mySubmission')}</Text>
            </View>
            {mine ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/(student)/results/${mine.id}` as never)}
                accessibilityRole="button"
              >
                <View style={styles.subRow}>
                  <View style={styles.subText}>
                    <Text style={[styles.value, { color: a.onGlass }]}>
                      {mine.finalScore ?? mine.score ?? mine.totalScore ?? '—'}
                    </Text>
                    <Text style={[styles.cdText, { color: a.onGlassSoft }]} numberOfLines={1}>
                      {mine.submittedAt ? formatDue(mine.submittedAt) : t('lecturer.notSubmitted')}
                    </Text>
                  </View>
                  <StatusBadge status={mine.status} />
                  <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} />
                </View>
                <Text style={[styles.linkText, { color: c.primary }]}>{t('detail.viewResult')}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.body, { color: a.onGlassSoft }]}>{t('detail.noSubmission')}</Text>
            )}
          </GlassCard>

          {/* description */}
          <GlassCard style={styles.block} strong>
            <View style={styles.blockHead}>
              <Ionicons name="document-text-outline" size={16} color={c.primary} />
              <Text style={[styles.label, { color: a.onGlassSoft }]}>{t('assignment.description')}</Text>
            </View>
            <Text style={[styles.body, { color: item.description ? a.onGlass : a.onGlassSoft }]}>
              {item.description ?? t('assignment.noDescription')}
            </Text>
          </GlassCard>

          {/* attachments */}
          {attachments.length > 0 ? (
            <GlassCard style={styles.block}>
              <View style={styles.blockHead}>
                <Ionicons name="attach-outline" size={16} color={c.primary} />
                <Text style={[styles.label, { color: a.onGlassSoft }]}>{t('detail.attachments')}</Text>
              </View>
              {attachments.map((f, i) => (
                <TouchableOpacity
                  key={f.id ?? i}
                  activeOpacity={0.85}
                  onPress={() => openFile(f.fileUrl)}
                  accessibilityRole="button"
                  accessibilityLabel={f.fileName}
                  style={[styles.fileRow, i > 0 && { borderTopWidth: 1, borderTopColor: a.glassBorder }]}
                >
                  <Ionicons name="document-outline" size={16} color={a.onGlassSoft} />
                  <Text style={[styles.fileName, { color: a.onGlass }]} numberOfLines={1}>
                    {f.fileName}
                  </Text>
                  <Ionicons name="open-outline" size={16} color={c.primary} />
                </TouchableOpacity>
              ))}
              {fileError ? <InlineToast text={fileError} tone="error" /> : null}
            </GlassCard>
          ) : null}

          {/* rubric */}
          {rubrics.length > 0 ? (
            <GlassCard style={styles.block}>
              <View style={styles.blockHead}>
                <Ionicons name="list-outline" size={16} color={c.primary} />
                <Text style={[styles.label, { color: a.onGlassSoft }]}>{t('detail.rubric')}</Text>
              </View>
              {rubrics.map((r, i) => (
                <View key={r.id ?? i} style={[styles.ruleRow, i > 0 && { borderTopWidth: 1, borderTopColor: a.glassBorder }]}>
                  <Text style={[styles.ruleText, { color: a.onGlass }]}>{r.description ?? '—'}</Text>
                  {r.maxPoints != null ? (
                    <Text style={[styles.rulePoints, { color: a.onGlassSoft }]}>
                      {t('detail.points', { points: r.maxPoints })}
                    </Text>
                  ) : null}
                </View>
              ))}
            </GlassCard>
          ) : null}

          {/* late policy */}
          <GlassCard style={styles.block}>
            <View style={styles.blockHead}>
              <Ionicons name="alarm-outline" size={16} color={c.primary} />
              <Text style={[styles.label, { color: a.onGlassSoft }]}>{t('detail.latePolicy')}</Text>
            </View>
            <Text style={[styles.body, { color: a.onGlass }]}>
              {item.allowLateSubmission === false ? t('detail.lateBlocked') : t('detail.lateAllowed')}
            </Text>
            <Text style={[styles.body, { color: a.onGlassSoft }]}>{penaltySentence()}</Text>
            {item.maxLatePenalty != null ? (
              <Text style={[styles.body, { color: a.onGlassSoft }]}>
                {t('detail.penaltyCap', { value: item.maxLatePenalty })}
              </Text>
            ) : null}
          </GlassCard>

          <View style={styles.note}>
            <InlineToast text={t('detail.submitOnWeb')} tone="info" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130 },
  headSpacer: { height: 40 }, // clears the floating transparent back button
  title: { ...Type.greeting, fontWeight: '800', letterSpacing: 0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 6, flexWrap: 'wrap' },
  block: { marginTop: 12, gap: 10 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { ...Type.chip, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { ...Type.title, fontWeight: '700' },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  cd: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  cdText: { ...Type.body, fontWeight: '600' },
  body: { ...Type.bodyLg, lineHeight: 24, fontWeight: '400' },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10 },
  factLabel: { ...Type.body, fontWeight: '600', width: 96 },
  factValue: { ...Type.body, fontWeight: '700', flex: 1, textAlign: 'right' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subText: { flex: 1, gap: 2 },
  linkText: { ...Type.body, fontWeight: '700', marginTop: 8 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 11 },
  fileName: { ...Type.body, fontWeight: '600', flex: 1 },
  ruleRow: { paddingVertical: 10, gap: 3 },
  ruleText: { ...Type.body, fontWeight: '600', lineHeight: 19 },
  rulePoints: { ...Type.chip, fontWeight: '700' },
  note: { marginTop: 20 },
})
