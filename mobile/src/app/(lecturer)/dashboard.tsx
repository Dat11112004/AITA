import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { StatusBadge } from '@/components/StatusBadge'
import { SubjectTile } from '@/components/SubjectTile'
import { Aurora, Colors, Layout, Type } from '@/constants/theme'
import { api, ApiError, type ClassRow, type LecturerReport, type SubmissionRow } from '@/lib/api'
import { useAuth } from '@/store/AuthContext'

type Stat = { icon: keyof typeof Ionicons.glyphMap; tint: string; value: string | number; label: string }

export default function LecturerDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [report, setReport] = useState<LecturerReport | null>(null)
  const [recent, setRecent] = useState<SubmissionRow[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const [rep, rec, cls] = await Promise.allSettled([api.getLecturerReport(), api.getRecentSubmissions(), api.getClasses(1, 50)])
        if (rep.status === 'rejected' && rec.status === 'rejected' && cls.status === 'rejected') {
          throw rep.reason instanceof ApiError ? rep.reason : new Error(t('common.error'))
        }
        setReport(rep.status === 'fulfilled' ? rep.value : null)
        setRecent(rec.status === 'fulfilled' ? (rec.value ?? []) : [])
        setClasses(cls.status === 'fulfilled' ? (cls.value ?? []) : [])
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

  if (loading) return <AuroraBackground><Loading /></AuroraBackground>
  if (error) return <AuroraBackground><ErrorView message={error} onRetry={() => load('initial')} /></AuroraBackground>

  const name = user?.fullName ?? user?.email ?? ''
  const initial = (name.trim()[0] ?? '?').toUpperCase()
  const totalStudents = classes.reduce((s, cl) => s + (cl.studentCount ?? 0), 0)

  const stats: Stat[] = [
    { icon: 'school', tint: c.primary, value: classes.length, label: t('stats.classes') },
    { icon: 'people', tint: '#0284C7', value: totalStudents, label: t('stats.students') },
    { icon: 'checkmark-done', tint: '#F59E0B', value: recent.length, label: t('stats.toGrade') },
    { icon: 'ribbon', tint: '#4D9E0E', value: report?.avgScore ?? '—', label: t('stats.avgScore') },
  ]

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top']} style={styles.fill}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />}
        >
          {/* profile summary — tap to open full profile */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/profile' as any)}>
            <GlassCard style={styles.profile} glow>
              <View style={[styles.avatar, { backgroundColor: c.primary }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: a.onGlass }]} numberOfLines={1}>{name}</Text>
                <Text style={[styles.profileMeta, { color: a.onGlassSoft }]} numberOfLines={1}>
                  {t('lecturer.role')} · {user?.email ?? ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={a.onGlassSoft} />
            </GlassCard>
          </TouchableOpacity>

          {/* stat grid (2×2) */}
          <View style={styles.grid}>
            {stats.map((s) => (
              <GlassCard key={s.label} style={styles.stat} padded={false}>
                <View style={styles.statInner}>
                  <View style={[styles.statIcon, { backgroundColor: s.tint + '22' }]}>
                    <Ionicons name={s.icon} size={18} color={s.tint} />
                  </View>
                  <Text style={[styles.statValue, { color: a.onGlass }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: a.onGlassSoft }]}>{s.label}</Text>
                </View>
              </GlassCard>
            ))}
          </View>

          {/* recent submissions */}
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { color: a.onGlass }]}>{t('lecturer.recentTitle')}</Text>
            {recent.length > 0 ? (
              <TouchableOpacity onPress={() => router.push('/(lecturer)/grading' as any)}>
                <Text style={[styles.seeAll, { color: c.primary }]}>{t('lecturer.heroAction')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {recent.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Ionicons name="file-tray-outline" size={22} color={a.onGlassSoft} />
              <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('lecturer.noRecent')}</Text>
            </GlassCard>
          ) : (
            recent.slice(0, 4).map((s) => (
              <TouchableOpacity key={s.id} activeOpacity={0.85} onPress={() => router.push(`/(lecturer)/grading/${s.id}` as any)}>
                <GlassCard style={styles.subCard}>
                  <View style={styles.subLeft}>
                    <Text style={[styles.subName, { color: a.onGlass }]} numberOfLines={1}>{s.studentName ?? t('lecturer.student')}</Text>
                    <Text style={[styles.subMeta, { color: a.onGlassSoft }]} numberOfLines={1}>{s.className ?? '—'}</Text>
                  </View>
                  <View style={styles.subRight}>
                    <StatusBadge status={s.status} />
                    <Text style={[styles.subScore, { color: a.onGlass }]}>{s.score ?? s.aiScore ?? '—'}</Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))
          )}

          {/* classes */}
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { color: a.onGlass }]}>{t('lecturer.myClasses')}</Text>
            <TouchableOpacity onPress={() => router.push('/(lecturer)/classes' as any)}>
              <Text style={[styles.seeAll, { color: c.primary }]}>{t('lecturer.classCount', { count: classes.length })}</Text>
            </TouchableOpacity>
          </View>
          {classes.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('lecturer.noClasses')}</Text>
          ) : (
            <View style={styles.grid}>
              {classes.slice(0, 4).map((cl) => (
                <SubjectTile
                  key={cl.id}
                  subject={cl.code}
                  caption={cl.name}
                  onPress={() => router.push(`/(lecturer)/classes/${cl.id}?code=${encodeURIComponent(cl.code)}&name=${encodeURIComponent(cl.name)}` as any)}
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
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { ...Type.title, fontWeight: '800' },
  profileMeta: { ...Type.body },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.gridGap },
  stat: { flexBasis: '48%', flexGrow: 1 },
  statInner: { padding: 14, gap: 6 },
  statIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...Type.greeting, fontWeight: '800', marginTop: 2 },
  statLabel: { ...Type.chip, fontWeight: '700' },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 },
  section: { ...Type.title, fontWeight: '800' },
  seeAll: { ...Type.body, fontWeight: '700' },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 22 },
  empty: { ...Type.body, textAlign: 'center' },
  subCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  subLeft: { flex: 1, gap: 3 },
  subName: { ...Type.bodyLg, fontWeight: '700' },
  subMeta: { ...Type.body },
  subRight: { alignItems: 'flex-end', gap: 4 },
  subScore: { ...Type.title, fontWeight: '800' },
})
