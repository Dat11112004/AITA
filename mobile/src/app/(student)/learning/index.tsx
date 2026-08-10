import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { SectionHeader } from '@/components/SectionHeader'
import { StatTiles } from '@/components/StatTiles'
import { SubjectTile } from '@/components/SubjectTile'
import { Aurora, Colors, Layout, Type } from '@/constants/theme'
import { api, ApiError, type AssignmentRow, type StudentHistoryRow, type StudentSubject } from '@/lib/api'

/**
 * "Học tập" — the student's subjects, and who teaches them.
 *
 * The screen used to be a bare grid of subject codes, which is the least useful thing the
 * API returns about a subject: `/student-portal/subjects` also carries the class code and
 * the assigned lecturers, and the assignment list can be rolled up per subject. Both are
 * folded in here so a tile answers "how much work does this subject have?" without a tap.
 */
export default function LearningScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [subjects, setSubjects] = useState<StudentSubject[]>([])
  /** When the data was fetched — the reference point for "sắp đến hạn". See the list screen. */
  const [loadedAt, setLoadedAt] = useState(0)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
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
        // Chỉ còn danh sách môn học — khối "Lớp học" đã bỏ (chốt 2026-08-03):
        // lớp vẫn xem được qua chi tiết môn, để ở đây là trùng lặp.
        // Assignments and history are supporting data: only the subject call can fail the
        // screen, the other two just leave their roll-ups empty.
        const [subs, asg, hist] = await Promise.allSettled([
          api.getStudentPortalSubjects(),
          api.getAssignments(),
          api.getStudentHistory(),
        ])
        if (subs.status === 'rejected') {
          throw subs.reason instanceof ApiError ? subs.reason : new Error(t('common.error'))
        }
        setLoadedAt(Date.now())
        setSubjects(subs.value ?? [])
        setAssignments(asg.status === 'fulfilled' ? (asg.value ?? []) : [])
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

  const now = loadedAt
  // ExamResponseDto gives `subjectId` on every row; `class` (the short subject code derived
  // at the API boundary) is the fallback for rows that predate it.
  const forSubject = (s: StudentSubject) =>
    assignments.filter((x) => (x.subjectId ? x.subjectId === s.id : x.class === s.code))

  const isUpcoming = (x: AssignmentRow) => {
    if ((x.status ?? '').toUpperCase() !== 'PUBLISHED' || !x.due) return false
    const due = new Date(x.due).getTime()
    return !Number.isNaN(due) && due >= now
  }

  const semester = subjects.find((s) => s.semester?.label)?.semester?.label ?? null

  // One lecturer can teach several of the student's subjects, so they are collapsed to one
  // row carrying every subject code they appear under.
  const lecturers = new Map<string, { name: string; avatar?: string | null; subjects: string[] }>()
  for (const s of subjects) {
    for (const l of s.lecturers ?? []) {
      const key = l.id || l.name
      if (!key) continue
      const entry = lecturers.get(key)
      if (entry) {
        if (!entry.subjects.includes(s.code)) entry.subjects.push(s.code)
      } else {
        lecturers.set(key, { name: l.name, avatar: l.avatar, subjects: [s.code] })
      }
    }
  }
  const lecturerRows = Array.from(lecturers.entries())

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
          <View style={styles.head}>
            <Text style={[styles.title, { color: a.onGlass }]}>{t('learning.title')}</Text>
            <Text style={[styles.subtitle, { color: a.onGlassSoft }]}>
              {semester
                ? t('learning.subtitleSemester', { count: subjects.length, semester })
                : t('learning.subtitle', { count: subjects.length })}
            </Text>
          </View>

          <StatTiles
            items={[
              { icon: 'library-outline', value: subjects.length, label: t('learning.statSubjects') },
              { icon: 'document-text-outline', value: assignments.length, label: t('learning.statAssignments') },
              { icon: 'cloud-upload-outline', value: history.length, label: t('learning.statSubmitted') },
            ]}
          />

          <View style={styles.block}>
            <SectionHeader title={t('learning.subjects')} hint={subjects.length > 0 ? t('learning.lecturersHint') : undefined} />
            {subjects.length === 0 ? (
              <EmptyState icon="library-outline" title={t('learning.noSubjects')} hint={t('learning.noSubjectsHint')} />
            ) : (
              <View style={styles.gridRow}>
                {subjects.map((s) => {
                  const mine = forSubject(s)
                  const due = mine.filter(isUpcoming).length
                  const footer =
                    mine.length === 0
                      ? t('learning.subjectMetaNone')
                      : due > 0
                        ? `${t('learning.subjectMeta', { count: mine.length })} · ${t('learning.subjectMetaDue', { count: due })}`
                        : t('learning.subjectMeta', { count: mine.length })
                  return (
                    <SubjectTile
                      key={s.id}
                      subject={s.code}
                      caption={s.name}
                      badge={s.classCode}
                      footer={footer}
                      onPress={() =>
                        router.push(
                          `/(student)/learning/subject/${s.id}?code=${encodeURIComponent(s.code)}&name=${encodeURIComponent(s.name)}` as never,
                        )
                      }
                    />
                  )
                })}
              </View>
            )}
          </View>

          <View style={styles.block}>
            <SectionHeader title={t('learning.lecturersSection')} />
            {lecturerRows.length === 0 ? (
              <EmptyState icon="person-outline" title={t('learning.noLecturers')} hint={t('learning.noLecturersHint')} />
            ) : (
              lecturerRows.map(([key, l]) => (
                <GlassCard key={key} style={styles.person}>
                  <Avatar name={l.name} uri={l.avatar} size={42} />
                  <View style={styles.personBody}>
                    <Text style={[styles.personName, { color: a.onGlass }]} numberOfLines={1}>
                      {l.name}
                    </Text>
                    <Text style={[styles.personMeta, { color: a.onGlassSoft }]} numberOfLines={1}>
                      {t('learning.teaches', { list: l.subjects.join(' · ') })}
                    </Text>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, gap: 14 },
  head: { gap: 3 },
  title: { ...Type.greeting, fontWeight: '800' },
  subtitle: { ...Type.body, fontWeight: '600' },
  block: { gap: 10, marginTop: 8 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.gridGap },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  personBody: { flex: 1, gap: 3 },
  personName: { ...Type.bodyLg, fontWeight: '700' },
  personMeta: { ...Type.body },
})
