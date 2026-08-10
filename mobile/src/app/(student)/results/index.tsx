import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { HeroCard } from '@/components/HeroCard'
import { Loading } from '@/components/Loading'
import { SectionHeader } from '@/components/SectionHeader'
import { StatTiles } from '@/components/StatTiles'
import { StatusBadge } from '@/components/StatusBadge'
import { SubjectChip } from '@/components/SubjectChip'
import { Aurora, Colors, gradientForSubject, Layout, tint, Type } from '@/constants/theme'
import { api, ApiError, type StudentHistoryRow, type StudentProgress } from '@/lib/api'
import { formatDue } from '@/lib/countdown'

/** The published score of a row, or null when the lecturer has not released it yet. */
const publishedScore = (h: StudentHistoryRow): number | null => {
  const raw = h.finalScore ?? h.totalScore
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isNaN(n) ? null : n
}

/**
 * Transcript + submission history.
 *
 * The two live together because the numbers at the top are a summary of the list below it;
 * splitting them would mean scrolling between a figure and the rows that produced it. The
 * per-subject band in between is derived from the same history rows — it is the one cut of
 * the data the API does not return ready-made, and the one a student actually asks for.
 */
export default function ResultsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [progress, setProgress] = useState<StudentProgress | null>(null)
  const [history, setHistory] = useState<StudentHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const [prog, hist] = await Promise.allSettled([api.getStudentProgress(), api.getStudentHistory()])
        if (prog.status === 'rejected' && hist.status === 'rejected') {
          throw prog.reason instanceof ApiError ? prog.reason : new Error(t('common.error'))
        }
        setProgress(prog.status === 'fulfilled' ? prog.value : null)
        setHistory(hist.status === 'fulfilled' ? (hist.value ?? []) : [])
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('common.error'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [t],
  )

  useEffect(() => {
    load('initial')
  }, [load])

  // A grade published while the student had the app open must appear when they come back to
  // this tab, not only after a pull-to-refresh. Tabs are never unmounted, so the initial
  // effect alone would keep showing whatever was true at launch.
  const focused = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (!focused.current) {
        focused.current = true
        return
      }
      load('refresh')
    }, [load]),
  )

  if (loading) {
    return (
      <AuroraBackground>
        <Loading />
      </AuroraBackground>
    )
  }
  if (error) {
    return (
      <AuroraBackground>
        <ErrorView message={error} onRetry={() => load('initial')} />
      </AuroraBackground>
    )
  }

  // "Xếp hạng" and "Chuỗi ngày học" were dropped on 2026-08-03: the backend hard-codes rank to
  // '—' and `streak` is just the graded-submission count under a name that promises a day
  // streak. Two tiles that can never tell the truth are worse than none.
  const graded = progress?.done ?? 0
  const published = history.filter((h) => publishedScore(h) !== null).length

  // Per-subject averages, over published scores only — an unpublished row counted as 0 would
  // drag the average down and the student would read it as a bad mark rather than a pending one.
  const bySubject = new Map<string, { total: number; count: number }>()
  for (const h of history) {
    const score = publishedScore(h)
    const key = (h.className ?? '').trim()
    if (score === null || !key) continue
    const entry = bySubject.get(key)
    if (entry) {
      entry.total += score
      entry.count += 1
    } else {
      bySubject.set(key, { total: score, count: 1 })
    }
  }
  const subjectRows = Array.from(bySubject.entries())
    .map(([name, s]) => ({ name, avg: s.total / s.count, count: s.count }))
    .sort((x, y) => y.avg - x.avg)

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top']} style={styles.fill}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />
          }
        >
          <Text style={[styles.title, { color: a.onGlass }]}>{t('results.title')}</Text>

          <HeroCard
            // Same rule as the dashboard: with nothing graded, `gpa` is 0 and a giant "0"
            // reads as a failing mark instead of as "no data yet".
            value={graded > 0 ? (progress?.gpa ?? '—') : '—'}
            unit={t('dashboard.heroUnit')}
            caption={t('results.gpa')}
          />

          <StatTiles
            items={[
              { icon: 'checkmark-done-outline', value: graded, label: t('results.done') },
              { icon: 'document-text-outline', value: history.length, label: t('results.submitted') },
              { icon: 'hourglass-outline', value: Math.max(history.length - published, 0), label: t('results.awaiting') },
            ]}
          />

          <View style={styles.block}>
            <SectionHeader
              title={t('results.bySubject')}
              hint={subjectRows.length > 0 ? t('results.bySubjectHint') : undefined}
            />
            {subjectRows.length === 0 ? (
              <EmptyState icon="stats-chart-outline" title={t('results.noBySubject')} hint={t('results.noBySubjectHint')} />
            ) : (
              <GlassCard style={styles.subjectCard}>
                {subjectRows.map((s, i) => {
                  const [from] = gradientForSubject(s.name)
                  return (
                    <View key={s.name} style={[styles.subjectRow, i > 0 && { borderTopWidth: 1, borderTopColor: tint(a.onGlassSoft, 0.16) }]}>
                      <View style={styles.subjectHead}>
                        <SubjectChip subject={s.name} />
                        <Text style={[styles.subjectScore, { color: a.onGlass }]}>{s.avg.toFixed(1)}</Text>
                      </View>
                      <View style={[styles.track, { backgroundColor: tint(a.onGlassSoft, 0.16) }]}>
                        <View
                          style={[
                            styles.fill10,
                            { width: `${Math.max(0, Math.min(100, (s.avg / 10) * 100))}%`, backgroundColor: from },
                          ]}
                        />
                      </View>
                      <Text style={[styles.subjectMeta, { color: a.onGlassSoft }]}>
                        {t('results.avgOf', { count: s.count })}
                      </Text>
                    </View>
                  )
                })}
              </GlassCard>
            )}
          </View>

          <View style={styles.block}>
            <SectionHeader title={t('results.history')} hint={history.length > 0 ? t('results.historyHint') : undefined} />
            {history.length === 0 ? (
              <EmptyState
                icon="cloud-upload-outline"
                title={t('results.noHistory')}
                hint={t('results.noHistoryHint')}
                actionLabel={t('results.footerAction')}
                onAction={() => router.push('/(student)/assignments' as any)}
              />
            ) : (
              history.map((h) => {
                // BE nulls every score until the lecturer publishes, so an em-dash here means
                // "not published yet", not "zero".
                const score = publishedScore(h)
                return (
                  <TouchableOpacity
                    key={h.id}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/(student)/results/${h.id}` as never)}
                  >
                    <GlassCard>
                      <View style={styles.row}>
                        <View style={styles.rowText}>
                          <Text style={[styles.rowTitle, { color: a.onGlass }]} numberOfLines={2}>
                            {h.assignment ?? '—'}
                          </Text>
                          <Text style={[styles.rowMeta, { color: a.onGlassSoft }]} numberOfLines={1}>
                            {h.className ? `${h.className} · ` : ''}
                            {h.submittedAt ? formatDue(h.submittedAt) : t('lecturer.notSubmitted')}
                          </Text>
                          <StatusBadge status={h.status} />
                        </View>
                        <View style={styles.rowRight}>
                          <View style={styles.scoreBox}>
                            <Text style={[styles.score, { color: score === null ? a.onGlassSoft : a.onGlass }]}>
                              {score === null ? '—' : String(score)}
                            </Text>
                            <Text style={[styles.scoreUnit, { color: a.onGlassSoft }]}>
                              {score === null ? t('results.notPublishedShort') : t('dashboard.heroUnit')}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} />
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                )
              })
            )}
          </View>

          {history.length > 0 ? (
            <GlassCard style={styles.footer}>
              <Ionicons name="information-circle-outline" size={18} color={a.onGlassSoft} />
              <Text style={[styles.footerHint, { color: a.onGlassSoft }]}>{t('results.footerHint')}</Text>
            </GlassCard>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, gap: 12 },
  title: { ...Type.greeting, fontWeight: '800' },
  block: { gap: 10, marginTop: 8 },
  subjectCard: { gap: 0, paddingVertical: 6 },
  subjectRow: { gap: 7, paddingVertical: 12 },
  subjectHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  subjectScore: { ...Type.title, fontWeight: '800' },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill10: { height: '100%', borderRadius: 4 },
  subjectMeta: { ...Type.chip, lineHeight: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, gap: 6, alignItems: 'flex-start' },
  rowTitle: { ...Type.bodyLg, fontWeight: '700' },
  rowMeta: { ...Type.body },
  rowRight: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  scoreBox: { alignItems: 'flex-end', gap: 1 },
  score: { ...Type.title, fontSize: 22, lineHeight: 26, fontWeight: '800' },
  scoreUnit: { ...Type.chip, fontSize: 10.5, lineHeight: 13 },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  footerHint: { flex: 1, ...Type.chip, lineHeight: 16 },
})
