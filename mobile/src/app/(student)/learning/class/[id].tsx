import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
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
import { Aurora, Colors, Layout, Type } from '@/constants/theme'
import { api, ApiError, type ClassDetail } from '@/lib/api'
import { countdownTo, formatDue } from '@/lib/countdown'

/**
 * A class as the student sees it: who teaches it, who else is in it, and what it has set.
 * Everything comes from one call — `/student-portal/classes/:id` already nests all three.
 */
export default function StudentClassDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id, code, name } = useLocalSearchParams<{ id: string; code?: string; name?: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [detail, setDetail] = useState<ClassDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        setDetail(await api.getStudentClassDetail(String(id)))
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

  if (loading) {
    return (
      <AuroraBackground>
        <Loading />
      </AuroraBackground>
    )
  }
  if (error || !detail) {
    return (
      <AuroraBackground>
        <ErrorView message={error ?? t('common.notFound')} onRetry={() => load('initial')} />
      </AuroraBackground>
    )
  }

  const heading = detail.code || code || t('learning.classDetail')
  const subtitle = detail.subject?.name ?? name ?? ''

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScreenHeader title={heading} fallback="/(student)/learning" />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />
          }
        >
          {subtitle ? (
            <Text style={[styles.subtitle, { color: a.onGlassSoft }]} numberOfLines={2}>
              {detail.subject?.code ? `${detail.subject.code} · ` : ''}
              {subtitle}
            </Text>
          ) : null}

          {/* lecturers */}
          <Text style={[styles.section, { color: a.onGlass }]}>{t('learning.lecturers')}</Text>
          {detail.lecturers.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('learning.noLecturers')}</Text>
          ) : (
            <GlassCard style={styles.list}>
              {detail.lecturers.map((l, i) => (
                <View key={l.id || i} style={[styles.person, i > 0 && { borderTopWidth: 1, borderTopColor: a.glassBorder }]}>
                  <Avatar name={l.name} uri={l.avatar} size={38} />
                  <View style={styles.personText}>
                    <Text style={[styles.personName, { color: a.onGlass }]} numberOfLines={1}>
                      {l.name || '—'}
                    </Text>
                    {l.email ? (
                      <Text style={[styles.personMeta, { color: a.onGlassSoft }]} numberOfLines={1}>
                        {l.email}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </GlassCard>
          )}

          {/* assignments */}
          <Text style={[styles.section, { color: a.onGlass }]}>{t('learning.assignmentsOfClass')}</Text>
          {detail.assignments.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('learning.noAssignments')}</Text>
          ) : (
            detail.assignments.map((asg) => {
              const cd = countdownTo(asg.due)
              return (
                <TouchableOpacity
                  key={asg.id}
                  activeOpacity={0.85}
                  style={styles.item}
                  onPress={() => router.push(`/(student)/assignments/${asg.id}` as never)}
                >
                  <GlassCard>
                    <View style={styles.asgRow}>
                      <View style={styles.asgText}>
                        <Text style={[styles.asgTitle, { color: a.onGlass }]} numberOfLines={2}>
                          {asg.title}
                        </Text>
                        <View style={styles.metaRow}>
                          <StatusBadge status={asg.status} />
                          <Text style={[styles.personMeta, { color: cd?.urgent ? c.danger : a.onGlassSoft }]}>
                            {asg.due ? (cd ? cd.label : formatDue(asg.due)) : t('assignment.noDue')}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} />
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              )
            })
          )}

          {/* classmates */}
          <Text style={[styles.section, { color: a.onGlass }]}>
            {t('learning.classmates')} · {detail.students.length}
          </Text>
          {detail.students.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('learning.noClassmates')}</Text>
          ) : (
            <GlassCard style={styles.list}>
              {detail.students.map((s, i) => (
                <View key={s.id || i} style={[styles.person, i > 0 && { borderTopWidth: 1, borderTopColor: a.glassBorder }]}>
                  <Avatar name={s.fullName || s.email} uri={s.avatar} size={38} />
                  <View style={styles.personText}>
                    <Text style={[styles.personName, { color: a.onGlass }]} numberOfLines={1}>
                      {s.fullName || s.email}
                    </Text>
                    <Text style={[styles.personMeta, { color: a.onGlassSoft }]} numberOfLines={1}>
                      {s.studentCode ? `${s.studentCode} · ` : ''}
                      {s.email}
                    </Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, gap: 8 },
  subtitle: { ...Type.bodyLg, fontWeight: '600' },
  section: { ...Type.title, fontWeight: '800', marginTop: 14 },
  empty: { ...Type.body },
  list: { paddingVertical: 2 },
  item: { marginTop: 2 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  personText: { flex: 1, gap: 1 },
  personName: { ...Type.bodyLg, fontWeight: '700' },
  personMeta: { ...Type.body },
  asgRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  asgText: { flex: 1, gap: 8 },
  asgTitle: { ...Type.bodyLg, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
})
