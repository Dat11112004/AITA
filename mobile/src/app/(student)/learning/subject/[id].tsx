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
import { api, ApiError, type AssignmentRow, type StudentSubject } from '@/lib/api'
import { countdownTo, formatDue } from '@/lib/countdown'

/**
 * A subject as the student sees it.
 *
 * There is no `GET /subjects/:id` for a student, so the subject is picked out of
 * `/student-portal/subjects` (which already merges the lecturers across every class of that
 * subject) and its assignments are filtered from `/assignments` by `subjectId` — the exam
 * list endpoint takes `classId`/`status`/`type` but not a subject, so the narrowing happens
 * here rather than server-side.
 */
export default function SubjectDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id, code, name } = useLocalSearchParams<{ id: string; code?: string; name?: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [subject, setSubject] = useState<StudentSubject | null>(null)
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
        const [subj, asg] = await Promise.allSettled([api.getStudentPortalSubjects(), api.getAssignments()])
        if (subj.status === 'rejected' && asg.status === 'rejected') {
          throw subj.reason instanceof ApiError ? subj.reason : new Error(t('common.error'))
        }

        const found = subj.status === 'fulfilled' ? (subj.value ?? []).find((s) => s.id === String(id)) : undefined
        setSubject(found ?? null)

        const all = asg.status === 'fulfilled' ? (asg.value ?? []) : []
        // Match on subjectId when the exam carries one; otherwise fall back to the short
        // subject code the boundary derived, so a payload missing subjectId still filters.
        const subjectCode = found?.code ?? code
        setAssignments(
          all.filter((x) => (x.subjectId ? x.subjectId === String(id) : subjectCode ? x.class === subjectCode : false)),
        )
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('common.error'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [id, code, t],
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

  const heading = subject?.code ?? code ?? t('learning.subjectDetail')
  const fullName = subject?.name ?? name ?? ''
  const lecturers = subject?.lecturers ?? []

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
          {fullName ? (
            <Text style={[styles.subtitle, { color: a.onGlass }]} numberOfLines={3}>
              {fullName}
            </Text>
          ) : null}
          {subject?.description ? (
            <Text style={[styles.desc, { color: a.onGlassSoft }]}>{subject.description}</Text>
          ) : null}

          {subject?.semester?.code || subject?.semester?.season ? (
            <GlassCard style={styles.factCard}>
              <View style={styles.factRow}>
                <Ionicons name="calendar-outline" size={16} color={c.primary} />
                <Text style={[styles.factLabel, { color: a.onGlassSoft }]}>{t('learning.semester')}</Text>
                <Text style={[styles.factValue, { color: a.onGlass }]} numberOfLines={1}>
                  {subject.semester.season ?? subject.semester.code}
                </Text>
              </View>
            </GlassCard>
          ) : null}

          <Text style={[styles.section, { color: a.onGlass }]}>{t('learning.lecturers')}</Text>
          {lecturers.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('learning.noLecturers')}</Text>
          ) : (
            <GlassCard style={styles.list}>
              {lecturers.map((l, i) => (
                <View key={l.id || i} style={[styles.person, i > 0 && { borderTopWidth: 1, borderTopColor: a.glassBorder }]}>
                  <Avatar name={l.name} uri={l.avatar} size={38} />
                  <Text style={[styles.personName, { color: a.onGlass }]} numberOfLines={1}>
                    {l.name || '—'}
                  </Text>
                </View>
              ))}
            </GlassCard>
          )}

          {subject?.classId ? (
            <>
              <Text style={[styles.section, { color: a.onGlass }]}>{t('learning.classesOfSubject')}</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  router.push(
                    `/(student)/learning/class/${subject.classId}?code=${encodeURIComponent(subject.classCode ?? '')}&name=${encodeURIComponent(fullName)}` as never,
                  )
                }
              >
                <GlassCard>
                  <View style={styles.asgRow}>
                    <Ionicons name="school-outline" size={18} color={c.primary} />
                    <Text style={[styles.personName, styles.flex, { color: a.onGlass }]} numberOfLines={1}>
                      {subject.classCode ?? '—'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </>
          ) : null}

          <Text style={[styles.section, { color: a.onGlass }]}>{t('learning.assignmentsOfSubject')}</Text>
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
                  onPress={() => router.push(`/(student)/assignments/${asg.id}` as never)}
                >
                  <GlassCard>
                    <View style={styles.asgRow}>
                      <View style={styles.asgText}>
                        <Text style={[styles.personName, { color: a.onGlass }]} numberOfLines={2}>
                          {asg.title}
                        </Text>
                        <View style={styles.metaRow}>
                          <StatusBadge status={asg.status} />
                          <Text style={[styles.factLabelFlex, { color: cd?.urgent ? c.danger : a.onGlassSoft }]}>
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
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, gap: 8 },
  subtitle: { ...Type.title, fontWeight: '800' },
  desc: { ...Type.body, lineHeight: 20 },
  factCard: { marginTop: 6 },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  factLabel: { ...Type.body, fontWeight: '600', width: 80 },
  factLabelFlex: { ...Type.body, fontWeight: '600' },
  factValue: { ...Type.body, fontWeight: '700', flex: 1, textAlign: 'right' },
  section: { ...Type.title, fontWeight: '800', marginTop: 14 },
  empty: { ...Type.body },
  list: { paddingVertical: 2 },
  item: { marginTop: 2 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  personName: { ...Type.bodyLg, fontWeight: '700' },
  flex: { flex: 1 },
  asgRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  asgText: { flex: 1, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
})
