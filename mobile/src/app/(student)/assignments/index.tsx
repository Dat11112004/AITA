import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AssignmentCard } from '@/components/AssignmentCard'
import { AuroraBackground } from '@/components/AuroraBackground'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { StatTiles } from '@/components/StatTiles'
import { Aurora, Colors, Layout, tint, Type } from '@/constants/theme'
import { api, ApiError, type AssignmentRow } from '@/lib/api'
import { DEV_PREVIEW, mockAssignments } from '@/lib/devPreview'
import { scheduleDeadlineReminders } from '@/lib/push'
import { secureStore } from '@/lib/secureStore'

const DAY = 86_400_000

/**
 * Deadline buckets. A flat list sorted by date makes the reader compute "is this soon?" for
 * every row; the bucket answers it once per group. Keys are resolved to labels at render so
 * the grouping logic stays free of i18n.
 */
type BucketKey = 'overdue' | 'today' | 'week' | 'later' | 'noDue'
const BUCKET_ORDER: BucketKey[] = ['overdue', 'today', 'week', 'later', 'noDue']

function bucketOf(row: AssignmentRow, now: number): BucketKey {
  if (!row.due) return 'noDue'
  const due = new Date(row.due).getTime()
  if (Number.isNaN(due)) return 'noDue'
  if (due < now) return 'overdue'
  // "Trong hôm nay" is measured against the end of the local day, not `now + 24h`, so a
  // deadline at 23:00 tonight and one at 08:00 tomorrow do not land in the same group.
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  if (due <= endOfToday.getTime()) return 'today'
  if (due <= now + 7 * DAY) return 'week'
  return 'later'
}

type ListRow =
  | { kind: 'header'; key: string; bucket: BucketKey; count: number }
  | { kind: 'item'; key: string; item: AssignmentRow }

export default function AssignmentsListScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [rows, setRows] = useState<AssignmentRow[]>([])
  // The instant the list was fetched. Bucketing against a fresh `Date.now()` on every render
  // would let a row hop from "Trong hôm nay" to "Đã quá hạn" mid-session just because the
  // filter chips were tapped; the boundary moves only when the data does.
  const [loadedAt, setLoadedAt] = useState(0)
  const [filter, setFilter] = useState<'all' | 'open' | 'overdue'>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const next = DEV_PREVIEW ? mockAssignments : ((await api.getAssignments()) ?? [])
        setRows(next)
        setLoadedAt(Date.now())

        // Deadlines move and assignments close, so the reminder set is re-booked from the
        // freshest list every time it loads — but only for a user who opted in, and never
        // in a way that can fail the screen.
        if (await secureStore.getPushPref()) {
          scheduleDeadlineReminders(next, {
            title: t('push.reminderTitle'),
            body: (title, when) => t('push.reminderBody', { title, when }),
            in24h: t('push.in24h'),
            in2h: t('push.in2h'),
          }).catch(() => {})
        }
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

  const now = loadedAt
  const isOverdue = (x: AssignmentRow) => {
    const due = x.due ? new Date(x.due).getTime() : NaN
    return !Number.isNaN(due) && due < now
  }
  const buckets = {
    all: rows,
    open: rows.filter((x) => !isOverdue(x)),
    overdue: rows.filter(isOverdue),
  }
  const visible = buckets[filter]
  const urgentCount = buckets.open.filter((x) => {
    const b = bucketOf(x, now)
    return b === 'today' || b === 'week'
  }).length

  // Flattened into one array (headers included) rather than a SectionList so the whole screen
  // stays a single virtualized list with one scroll position.
  const grouped = new Map<BucketKey, AssignmentRow[]>()
  for (const row of visible) {
    const key = bucketOf(row, now)
    const list = grouped.get(key)
    if (list) list.push(row)
    else grouped.set(key, [row])
  }
  const listData: ListRow[] = []
  for (const bucket of BUCKET_ORDER) {
    const items = grouped.get(bucket)
    if (!items?.length) continue
    items.sort((x, y) => {
      const tx = x.due ? new Date(x.due).getTime() : Number.POSITIVE_INFINITY
      const ty = y.due ? new Date(y.due).getTime() : Number.POSITIVE_INFINITY
      // Overdue reads best newest-first ("what did I just miss?"); everything else soonest-first.
      return bucket === 'overdue' ? ty - tx : tx - ty
    })
    listData.push({ kind: 'header', key: `h-${bucket}`, bucket, count: items.length })
    for (const item of items) listData.push({ kind: 'item', key: item.id, item })
  }

  const bucketLabel: Record<BucketKey, string> = {
    overdue: t('assignments.groupOverdue'),
    today: t('assignments.groupToday'),
    week: t('assignments.groupWeek'),
    later: t('assignments.groupLater'),
    noDue: t('assignments.groupNoDue'),
  }
  const emptyTitle =
    filter === 'open' ? t('assignments.emptyOpen') : filter === 'overdue' ? t('assignments.emptyOverdue') : t('assignments.empty')

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <FlatList
          data={listData}
          keyExtractor={(x) => x.key}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.head}>
              <Text style={[styles.title, { color: a.onGlass }]}>{t('assignments.title')}</Text>
              <Text style={[styles.subtitle, { color: a.onGlassSoft }]}>
                {t('assignments.subtitle', { count: rows.length })}
              </Text>

              <StatTiles
                items={[
                  { icon: 'play-circle-outline', value: buckets.open.length, label: t('assignments.statOpen') },
                  { icon: 'alarm-outline', value: urgentCount, label: t('assignments.statUrgent') },
                  { icon: 'alert-circle-outline', value: buckets.overdue.length, label: t('assignments.statOverdue') },
                ]}
              />

              {/* Counts live on the chips themselves, so an empty bucket is visibly empty
                  instead of looking like a screen that failed to load. */}
              <View style={styles.filters}>
                {([
                  ['all', t('assignments.filterAll')],
                  ['open', t('assignments.filterOpen')],
                  ['overdue', t('assignments.filterOverdue')],
                ] as const).map(([key, label]) => {
                  const active = filter === key
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.85}
                      onPress={() => setFilter(key)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.chip,
                        { backgroundColor: active ? c.primarySoft : a.glass, borderColor: active ? c.primary : a.glassBorder },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? c.primary : a.onGlassSoft }]}>
                        {label} · {buckets[key].length}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />
          }
          renderItem={({ item: row }) =>
            row.kind === 'header' ? (
              <View style={styles.groupHead}>
                <View style={[styles.groupLine, { backgroundColor: tint(a.onGlassSoft, 0.35) }]} />
                <Text style={[styles.groupText, { color: row.bucket === 'overdue' ? c.danger : a.onGlassSoft }]}>
                  {bucketLabel[row.bucket]} · {row.count}
                </Text>
                <View style={[styles.groupLine, { backgroundColor: tint(a.onGlassSoft, 0.35) }]} />
              </View>
            ) : (
              <AssignmentCard
                assignment={row.item}
                variant="full"
                onPress={() => router.push(`/(student)/assignments/${row.item.id}` as any)}
              />
            )
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <EmptyState
              icon="documents-outline"
              title={emptyTitle}
              hint={filter === 'all' ? t('assignments.emptyHint') : t('assignments.emptyFilterHint')}
            />
          }
          ListFooterComponent={
            visible.length > 0 ? (
              <GlassCard style={styles.footer}>
                <Ionicons name="information-circle-outline" size={18} color={a.onGlassSoft} />
                <View style={styles.footerBody}>
                  <Text style={[styles.footerTitle, { color: a.onGlass }]}>
                    {t('assignments.footer', { count: visible.length })}
                  </Text>
                  <Text style={[styles.footerHint, { color: a.onGlassSoft }]}>{t('assignments.footerHint')}</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/(student)/results' as any)}
                    accessibilityRole="button"
                    style={styles.footerAction}
                  >
                    <Text style={[styles.footerActionText, { color: c.primary }]}>{t('assignments.footerAction')}</Text>
                    <Ionicons name="arrow-forward" size={14} color={c.primary} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ) : null
          }
        />
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, flexGrow: 1 },
  head: { marginBottom: 14, gap: 3 },
  title: { ...Type.greeting, fontWeight: '800' },
  subtitle: { ...Type.body, fontWeight: '600', marginBottom: 14 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipText: { ...Type.chip, fontWeight: '700' },
  sep: { height: 12 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 2 },
  groupLine: { flex: 1, height: 1, borderRadius: 1 },
  groupText: { ...Type.chip, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  footerBody: { flex: 1, gap: 4 },
  footerTitle: { ...Type.body, fontWeight: '700' },
  footerHint: { ...Type.chip, lineHeight: 16 },
  footerAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  footerActionText: { ...Type.body, fontWeight: '700' },
})
