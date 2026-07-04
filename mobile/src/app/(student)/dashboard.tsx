import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AssignmentCard } from '@/components/AssignmentCard'
import { Card } from '@/components/Card'
import { ErrorView } from '@/components/ErrorView'
import { Loading } from '@/components/Loading'
import { StatCard } from '@/components/StatCard'
import { Brand, BrandTint, Colors } from '@/constants/theme'
import { api, ApiError, type AssignmentRow, type ClassRow } from '@/lib/api'
import { DEV_PREVIEW, mockAssignments, mockClasses, mockOverview } from '@/lib/devPreview'
import { useAuth } from '@/store/AuthContext'

const STAT_KEYS = ['classes', 'assignments', 'submissions', 'averageScore'] as const

export default function DashboardScreen() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]

  const [overview, setOverview] = useState<Record<string, string | number>>({})
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        if (DEV_PREVIEW) {
          setOverview(mockOverview)
          setClasses(mockClasses)
          setAssignments(mockAssignments)
        } else {
          // Aggregate; tolerate a single failing endpoint, but surface a total failure.
          const [ov, cls, asg] = await Promise.allSettled([
            api.getStatsOverview(),
            api.getClasses(),
            api.getAssignments(),
          ])
          if (ov.status === 'rejected' && cls.status === 'rejected' && asg.status === 'rejected') {
            const reason = cls.reason
            throw reason instanceof ApiError ? reason : new Error(t('common.error'))
          }
          setOverview(ov.status === 'fulfilled' ? (ov.value ?? {}) : {})
          setClasses(cls.status === 'fulfilled' ? (cls.value ?? []) : [])
          setAssignments(asg.status === 'fulfilled' ? (asg.value ?? []) : [])
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
      <View style={[styles.fill, { backgroundColor: c.background }]}>
        <Loading />
      </View>
    )
  }
  if (error) {
    return (
      <View style={[styles.fill, { backgroundColor: c.background }]}>
        <ErrorView message={error} onRetry={() => load('initial')} />
      </View>
    )
  }

  const statEntries = STAT_KEYS.filter((k) => overview[k] !== undefined).map((k) => ({
    key: k,
    label: t(`dashboard.stat.${k}`),
    value: overview[k],
  }))
  const upcoming = assignments.slice(0, 3)

  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={BrandTint} colors={[BrandTint]} />
        }
      >
        {DEV_PREVIEW ? (
          <View style={styles.previewBadge}>
            <Text style={styles.previewText}>{t('common.preview')}</Text>
          </View>
        ) : null}

        <Text style={[styles.greeting, { color: c.text }]}>
          {t('dashboard.greeting', { name: user?.fullName ?? user?.email ?? '' })}
        </Text>
        <Text style={[styles.role, { color: c.textSecondary }]}>{t('dashboard.role', { role: user?.role ?? '' })}</Text>

        {statEntries.length > 0 ? (
          <View style={styles.statsRow}>
            {statEntries.map((s) => (
              <StatCard key={s.key} label={s.label} value={s.value} />
            ))}
          </View>
        ) : null}

        <Text style={[styles.section, { color: c.text }]}>{t('dashboard.myClasses')}</Text>
        {classes.length === 0 ? (
          <Text style={[styles.empty, { color: c.textSecondary }]}>{t('dashboard.noClasses')}</Text>
        ) : (
          classes.map((cl) => (
            <Card key={cl.id} style={styles.row}>
              <View style={[styles.badge, { backgroundColor: Brand[600] }]}>
                <Text style={styles.badgeText}>{cl.code}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
                  {cl.name}
                </Text>
                {cl.studentCount != null ? (
                  <Text style={[styles.rowSub, { color: c.textSecondary }]}>
                    {t('dashboard.students', { count: cl.studentCount })}
                  </Text>
                ) : null}
              </View>
            </Card>
          ))
        )}

        <Text style={[styles.section, { color: c.text }]}>{t('dashboard.upcoming')}</Text>
        {upcoming.length === 0 ? (
          <Text style={[styles.empty, { color: c.textSecondary }]}>{t('dashboard.noUpcoming')}</Text>
        ) : (
          upcoming.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onPress={() => router.push(`/(student)/assignments/${a.id}` as any)}
            />
          ))
        )}

        <TouchableOpacity onPress={logout} activeOpacity={0.8} style={[styles.logout, { borderColor: Brand[600] }]}>
          <Text style={[styles.logoutText, { color: Brand[600] }]}>{t('dashboard.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  previewBadge: { alignSelf: 'flex-start', backgroundColor: '#fde68a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  previewText: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  greeting: { fontSize: 24, fontWeight: '800' },
  role: { fontSize: 13, textTransform: 'capitalize', marginBottom: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  section: { fontSize: 17, fontWeight: '800', marginTop: 14 },
  empty: { fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
  logout: { marginTop: 18, height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 16, fontWeight: '700' },
})
