import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AssignmentCard } from '@/components/AssignmentCard'
import { AuroraBackground } from '@/components/AuroraBackground'
import { Avatar } from '@/components/Avatar'
import { ErrorView } from '@/components/ErrorView'
import { HeroCard } from '@/components/HeroCard'
import { Loading } from '@/components/Loading'
import { SubjectTile } from '@/components/SubjectTile'
import { Aurora, Colors, Layout, Radius, Type } from '@/constants/theme'
import { api, ApiError, type AssignmentRow, type ClassRow } from '@/lib/api'
import { DEV_PREVIEW, mockAssignments, mockClasses, mockOverview } from '@/lib/devPreview'
import { useAuth } from '@/store/AuthContext'

export default function DashboardScreen() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

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
          // /stats/overview carries no average score, so the hero below had nothing to show.
          // The real figure is the GPA from /stats/student-progress; fold it in as averageScore
          // so the hero keeps reading one key (and DEV_PREVIEW's mock still supplies its own).
          const [ov, cls, asg, prog] = await Promise.allSettled([
            api.getStatsOverview(),
            api.getClasses(),
            api.getAssignments(),
            api.getStudentProgress(),
          ])
          if (ov.status === 'rejected' && cls.status === 'rejected' && asg.status === 'rejected') {
            const reason = cls.reason
            throw reason instanceof ApiError ? reason : new Error(t('common.error'))
          }
          const merged: Record<string, string | number> = ov.status === 'fulfilled' ? { ...(ov.value ?? {}) } : {}
          const gpa = prog.status === 'fulfilled' ? prog.value?.gpa : undefined
          if (gpa !== undefined && gpa !== null) merged.averageScore = gpa
          // The caption says "…qua N bài nộp đã chấm", so N must be the number of scores the
          // average was computed from (`done`), not /stats/overview's count of every submission —
          // otherwise a student with 1 submitted-but-unpublished paper reads "0 điểm qua 1 bài đã chấm".
          const done = prog.status === 'fulfilled' ? prog.value?.done : undefined
          if (done !== undefined && done !== null) merged.submissions = done
          setOverview(merged)
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

  const pending = assignments.filter((x) => (x.status ?? '').toUpperCase() === 'PUBLISHED')
  const pendingCount = pending.length
  const upcoming = pending.slice(0, 4)
  const avgScore = overview.averageScore
  const submissions = Number(overview.submissions ?? 0)
  const name = user?.fullName ?? user?.email ?? ''

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
          {/* header: greeting + avatar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.hello, { color: a.onGlassSoft }]}>{t('login.welcomeBack')}</Text>
              <Text style={[styles.name, { color: a.onGlass }]} numberOfLines={1}>
                {name}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/profile' as any)} accessibilityRole="button">
              <Avatar name={name} uri={user?.avatar} size={48} />
            </TouchableOpacity>
          </View>

          {pendingCount > 0 ? (
            <Text style={[styles.lead, { color: a.onGlass }]}>
              {t('dashboard.pendingLead')}{' '}
              <Text style={{ color: c.danger, fontWeight: '800' }}>{t('dashboard.pendingCount', { count: pendingCount })}</Text>{' '}
              {t('dashboard.pendingTail')}
            </Text>
          ) : (
            <Text style={[styles.lead, { color: a.onGlass }]}>{t('dashboard.allCaughtUp')}</Text>
          )}

          <HeroCard
            value={avgScore ?? '—'}
            unit={t('dashboard.heroUnit')}
            caption={submissions > 0 ? t('dashboard.heroCaption', { count: submissions }) : t('dashboard.heroCaptionEmpty')}
            actionLabel={t('dashboard.heroAction')}
            onAction={() => router.push('/(student)/assignments' as any)}
          />

          {upcoming.length > 0 ? (
            <>
              <Text style={[styles.section, { color: a.onGlass }]}>{t('dashboard.pendingSection', { count: pendingCount })}</Text>
              <View style={styles.gridRow}>
                {upcoming.map((x) => (
                  <AssignmentCard
                    key={x.id}
                    assignment={x}
                    variant="grid"
                    onPress={() => router.push(`/(student)/assignments/${x.id}` as any)}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.section, { color: a.onGlass }]}>{t('dashboard.upcoming')}</Text>
              <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('dashboard.noUpcoming')}</Text>
            </>
          )}

          <Text style={[styles.section, { color: a.onGlass }]}>{t('dashboard.myClasses')}</Text>
          {classes.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('dashboard.noClasses')}</Text>
          ) : (
            <View style={styles.gridRow}>
              {classes.map((cl) => (
                <SubjectTile
                  key={cl.id}
                  subject={cl.code}
                  caption={cl.name}
                  // Was routing to the flat assignment list, which is not what tapping a
                  // class means. Now it opens that class.
                  onPress={() =>
                    router.push(
                      `/(student)/learning/class/${cl.id}?code=${encodeURIComponent(cl.code)}&name=${encodeURIComponent(cl.name)}` as any,
                    )
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, gap: 14, paddingBottom: 130 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  headerLeft: { flex: 1, gap: 2 },
  hello: { ...Type.body, fontWeight: '500' },
  name: { ...Type.greeting, fontWeight: '800', letterSpacing: 0.2 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4B3F86',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatarText: { fontSize: 20, fontWeight: '800' },
  lead: { ...Type.bodyLg, fontWeight: '500', letterSpacing: 0.2, marginTop: 2 },
  section: { ...Type.title, fontWeight: '800', marginTop: 12 },
  empty: { ...Type.body, marginTop: 2 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.gridGap, marginTop: 2 },
  logout: {
    marginTop: 22,
    height: 50,
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { ...Type.bodyLg, fontWeight: '700' },
})
