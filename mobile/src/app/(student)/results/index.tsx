import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { HeroCard } from '@/components/HeroCard'
import { Loading } from '@/components/Loading'
import { StatusBadge } from '@/components/StatusBadge'
import { Aurora, Colors, Layout, Type } from '@/constants/theme'
import { api, ApiError, type StudentHistoryRow, type StudentProgress } from '@/lib/api'
import { formatDue } from '@/lib/countdown'

/**
 * Transcript + submission history.
 *
 * The two live together because the numbers at the top are a summary of the list below it;
 * splitting them would mean scrolling between a figure and the rows that produced it.
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
  const published = history.filter((h) => h.finalScore != null || h.totalScore != null).length
  const stats: { icon: keyof typeof Ionicons.glyphMap; value: string | number; label: string }[] = [
    { icon: 'checkmark-done', value: graded, label: t('results.done') },
    { icon: 'document-text-outline', value: history.length, label: t('results.submitted') },
    { icon: 'hourglass-outline', value: Math.max(history.length - published, 0), label: t('results.awaiting') },
  ]

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
            value={progress?.gpa ?? '—'}
            unit={t('dashboard.heroUnit')}
            caption={t('results.gpa')}
          />

          <View style={styles.statRow}>
            {stats.map((s) => (
              <GlassCard key={s.label} style={styles.stat}>
                <Ionicons name={s.icon} size={17} color={c.primary} />
                <Text style={[styles.statValue, { color: a.onGlass }]} numberOfLines={1}>
                  {String(s.value)}
                </Text>
                <Text style={[styles.statLabel, { color: a.onGlassSoft }]} numberOfLines={1}>
                  {s.label}
                </Text>
              </GlassCard>
            ))}
          </View>

          <Text style={[styles.section, { color: a.onGlass }]}>{t('results.history')}</Text>
          {history.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('results.noHistory')}</Text>
          ) : (
            history.map((h) => {
              // BE nulls every score until the lecturer publishes, so an em-dash here means
              // "not published yet", not "zero".
              const score = h.finalScore ?? h.totalScore
              return (
                <TouchableOpacity
                  key={h.id}
                  activeOpacity={0.85}
                  style={styles.item}
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
                        <Text style={[styles.score, { color: a.onGlass }]}>
                          {score !== null && score !== undefined ? String(score) : '—'}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} />
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              )
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, gap: 12 },
  title: { ...Type.greeting, fontWeight: '800' },
  statRow: { flexDirection: 'row', gap: Layout.gridGap },
  stat: { flex: 1, alignItems: 'flex-start', gap: 4 },
  statValue: { ...Type.title, fontWeight: '800' },
  statLabel: { ...Type.chip },
  section: { ...Type.title, fontWeight: '800', marginTop: 10 },
  empty: { ...Type.body },
  item: { marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, gap: 6, alignItems: 'flex-start' },
  rowTitle: { ...Type.bodyLg, fontWeight: '700' },
  rowMeta: { ...Type.body },
  rowRight: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  score: { ...Type.title, fontWeight: '800' },
})
