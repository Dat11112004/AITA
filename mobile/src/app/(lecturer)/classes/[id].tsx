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
import { StatusBadge } from '@/components/StatusBadge'
import { Aurora, Colors, Layout, Type } from '@/constants/theme'
import { api, ApiError, type AssignmentRow, type StudentRow } from '@/lib/api'
import { countdownTo, formatDue } from '@/lib/countdown'

/**
 * A class as the lecturer sees it: the roster plus everything this class has been set.
 *
 * The assignment list is fetched with `classId`, which `ListExamsUseCase` honours (it also
 * widens the filter to the class's subject), so tapping straight through to that
 * assignment's submissions is one hop.
 */
export default function LecturerClassDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id, code, name } = useLocalSearchParams<{ id: string; code?: string; name?: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [rows, setRows] = useState<StudentRow[]>([])
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
        const [students, exams] = await Promise.allSettled([
          api.getClassStudents(String(id)),
          api.getAssignments({ classId: String(id) }),
        ])
        // Only a total failure is an error — a class with a roster but no assignments (or
        // the reverse) is a normal state, not a broken screen.
        if (students.status === 'rejected' && exams.status === 'rejected') {
          throw students.reason instanceof ApiError ? students.reason : new Error(t('common.error'))
        }
        setRows(students.status === 'fulfilled' ? (students.value ?? []) : [])
        setAssignments(exams.status === 'fulfilled' ? (exams.value ?? []) : [])
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
  if (error) {
    return (
      <AuroraBackground>
        <ErrorView message={error} onRetry={() => load('initial')} />
      </AuroraBackground>
    )
  }

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />
          }
        >
          <View style={styles.headSpacer} />
          <Text style={[styles.code, { color: a.onGlass }]}>{code ?? '—'}</Text>
          {name ? (
            <Text style={[styles.name, { color: a.onGlassSoft }]} numberOfLines={2}>
              {name}
            </Text>
          ) : null}

          {/* at-a-glance counts */}
          <View style={styles.statRow}>
            <GlassCard style={styles.stat}>
              <Ionicons name="people-outline" size={17} color={c.primary} />
              <Text style={[styles.statValue, { color: a.onGlass }]}>{rows.length}</Text>
              <Text style={[styles.statLabel, { color: a.onGlassSoft }]}>{t('lecturer.studentsTitle')}</Text>
            </GlassCard>
            <GlassCard style={styles.stat}>
              <Ionicons name="document-text-outline" size={17} color={c.primary} />
              <Text style={[styles.statValue, { color: a.onGlass }]}>{assignments.length}</Text>
              <Text style={[styles.statLabel, { color: a.onGlassSoft }]}>{t('assignments.title')}</Text>
            </GlassCard>
          </View>

          {/* assignments of this class */}
          <Text style={[styles.section, { color: a.onGlass }]}>{t('learning.assignmentsOfClass')}</Text>
          {assignments.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('learning.noAssignments')}</Text>
          ) : (
            assignments.map((asg) => {
              const cd = countdownTo(asg.due)
              return (
                <TouchableOpacity
                  key={asg.id}
                  activeOpacity={0.85}
                  style={styles.item}
                  onPress={() =>
                    router.push(
                      `/(lecturer)/grading/exam/${asg.id}?title=${encodeURIComponent(asg.title)}` as never,
                    )
                  }
                >
                  <GlassCard>
                    <View style={styles.row}>
                      <View style={styles.info}>
                        <Text style={[styles.sName, { color: a.onGlass }]} numberOfLines={2}>
                          {asg.title}
                        </Text>
                        <View style={styles.metaRow}>
                          <StatusBadge status={asg.status} />
                          <Text style={[styles.sMeta, { color: cd?.urgent ? c.danger : a.onGlassSoft }]}>
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

          {/* roster */}
          <Text style={[styles.section, { color: a.onGlass }]}>
            {t('lecturer.studentsTitle')} · {t('lecturer.studentCount', { count: rows.length })}
          </Text>
          {rows.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('lecturer.noStudents')}</Text>
          ) : (
            <GlassCard style={styles.list}>
              {rows.map((item, i) => (
                <View
                  key={item.id || i}
                  style={[styles.person, i > 0 && { borderTopWidth: 1, borderTopColor: a.glassBorder }]}
                >
                  <Avatar name={item.fullName || item.email} uri={item.avatar} size={40} />
                  <View style={styles.info}>
                    <Text style={[styles.sName, { color: a.onGlass }]} numberOfLines={1}>
                      {item.fullName || item.email}
                    </Text>
                    <Text style={[styles.sMeta, { color: a.onGlassSoft }]} numberOfLines={1}>
                      {item.studentCode ? `${item.studentCode} · ` : ''}
                      {item.email}
                    </Text>
                  </View>
                  {/* The roster payload carries no status, so show the dot only when one is
                      actually reported — a grey dot on every row reads as "everyone inactive". */}
                  {item.status ? (
                    <Ionicons
                      name="ellipse"
                      size={9}
                      color={item.status.toLowerCase() === 'active' ? c.success : a.onGlassSoft}
                    />
                  ) : null}
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
  content: { padding: Layout.screenPad, paddingBottom: 130, gap: 6 },
  headSpacer: { height: 40 },
  code: { ...Type.greeting, fontWeight: '800' },
  name: { ...Type.bodyLg },
  statRow: { flexDirection: 'row', gap: Layout.gridGap, marginTop: 12 },
  stat: { flex: 1, alignItems: 'flex-start', gap: 4 },
  statValue: { ...Type.title, fontWeight: '800' },
  statLabel: { ...Type.chip },
  section: { ...Type.title, fontWeight: '800', marginTop: 16 },
  empty: { ...Type.body },
  item: { marginTop: 2 },
  list: { paddingVertical: 2 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1, gap: 4 },
  sName: { ...Type.bodyLg, fontWeight: '700' },
  sMeta: { ...Type.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
})
