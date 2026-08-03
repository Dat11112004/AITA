import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { Avatar } from '@/components/Avatar'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { ScreenHeader } from '@/components/ScreenHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Aurora, Colors, Layout, Radius, Type } from '@/constants/theme'
import { api, ApiError, type SubmissionRow } from '@/lib/api'
import { formatDue } from '@/lib/countdown'

type Filter = 'all' | 'pending' | 'graded'

// Which grading statuses count as already marked. Everything else is still outstanding.
const GRADED = new Set(['GRADED', 'REVIEWED', 'PUBLISHED'])

/**
 * Every submission for one assignment.
 *
 * Filtering happens client-side rather than through the API's `status` query: the BE filter
 * matches a single `GradingStatus` value, but "đã chấm" spans GRADED / REVIEWED / PUBLISHED,
 * and one round trip per chip would make switching filters feel laggy for a list this size.
 */
export default function ExamSubmissionsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        setRows((await api.getSubmissionsByExam(String(id))) ?? [])
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('common.error'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [id, t],
  )

  useEffect(() => {
    load('initial')
  }, [load])

  const visible = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter((r) => {
      const graded = GRADED.has((r.status ?? '').toUpperCase())
      return filter === 'graded' ? graded : !graded
    })
  }, [rows, filter])

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

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: t('byExam.filterAll') },
    { value: 'pending', label: t('byExam.filterPending') },
    { value: 'graded', label: t('byExam.filterGraded') },
  ]

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScreenHeader title={title ?? t('byExam.submissionsOf')} fallback="/(lecturer)/grading" />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />
          }
        >
          <Text style={[styles.count, { color: a.onGlassSoft }]}>{t('byExam.countLabel', { count: visible.length })}</Text>

          <View style={styles.filters}>
            {FILTERS.map((f) => {
              const active = filter === f.value
              return (
                <TouchableOpacity
                  key={f.value}
                  activeOpacity={0.85}
                  onPress={() => setFilter(f.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? c.primary : a.glass, borderColor: active ? c.primary : a.glassBorder },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? c.onPrimary : a.onGlassSoft }]}>{f.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {visible.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('byExam.noSubmissions')}</Text>
          ) : (
            visible.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                style={styles.item}
                onPress={() => router.push(`/(lecturer)/grading/${item.id}` as never)}
              >
                <GlassCard>
                  <View style={styles.row}>
                    <Avatar name={item.studentName} size={38} />
                    <View style={styles.left}>
                      <Text style={[styles.name, { color: a.onGlass }]} numberOfLines={1}>
                        {item.studentName ?? t('lecturer.student')}
                      </Text>
                      <Text style={[styles.meta, { color: a.onGlassSoft }]} numberOfLines={1}>
                        {item.studentCode ? `${item.studentCode} · ` : ''}
                        {item.submittedAt ? formatDue(item.submittedAt) : t('lecturer.notSubmitted')}
                      </Text>
                    </View>
                    <View style={styles.right}>
                      <StatusBadge status={item.status} />
                      <Text style={[styles.score, { color: a.onGlass }]}>{item.score ?? item.aiScore ?? '—'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, gap: 8 },
  count: { ...Type.body, fontWeight: '600' },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 6, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { ...Type.body, fontWeight: '700' },
  empty: { ...Type.bodyLg, textAlign: 'center', marginTop: 40 },
  item: { marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  left: { flex: 1, gap: 2 },
  name: { ...Type.bodyLg, fontWeight: '700' },
  meta: { ...Type.body },
  right: { alignItems: 'flex-end', gap: 4 },
  score: { ...Type.title, fontWeight: '800' },
})
