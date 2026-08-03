import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AssignmentCard } from '@/components/AssignmentCard'
import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { Loading } from '@/components/Loading'
import { Aurora, Colors, Layout, Type } from '@/constants/theme'
import { api, ApiError, type AssignmentRow } from '@/lib/api'
import { DEV_PREVIEW, mockAssignments } from '@/lib/devPreview'
import { scheduleDeadlineReminders } from '@/lib/push'
import { secureStore } from '@/lib/secureStore'

export default function AssignmentsListScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [rows, setRows] = useState<AssignmentRow[]>([])
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

  const isOverdue = (x: AssignmentRow) => {
    const due = x.due ? new Date(x.due).getTime() : NaN
    return !Number.isNaN(due) && due < Date.now()
  }
  const buckets = {
    all: rows,
    open: rows.filter((x) => !isOverdue(x)),
    overdue: rows.filter(isOverdue),
  }
  const visible = buckets[filter]

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <FlatList
          data={visible}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.head}>
              <Text style={[styles.title, { color: a.onGlass }]}>{t('assignments.title')}</Text>
              <Text style={[styles.subtitle, { color: a.onGlassSoft }]}>
                {t('dashboard.pendingCount', { count: visible.length })}
              </Text>

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
          renderItem={({ item }) => (
            <AssignmentCard assignment={item} onPress={() => router.push(`/(student)/assignments/${item.id}` as any)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('assignments.empty')}</Text>}
        />
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, flexGrow: 1 },
  head: { marginBottom: 16, gap: 3 },
  title: { ...Type.greeting, fontWeight: '800' },
  subtitle: { ...Type.body, fontWeight: '600' },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipText: { ...Type.chip, fontWeight: '700' },
  sep: { height: 12 },
  empty: { ...Type.bodyLg, textAlign: 'center', marginTop: 40 },
})
