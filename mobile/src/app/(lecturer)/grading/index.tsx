import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { Avatar } from '@/components/Avatar'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { StatusBadge } from '@/components/StatusBadge'
import { Aurora, Colors, Layout, Radius, Type } from '@/constants/theme'
import { api, ApiError, type AssignmentRow, type SubmissionRow } from '@/lib/api'
import { countdownTo, formatDue } from '@/lib/countdown'

type Mode = 'recent' | 'byExam'

/**
 * The grading hub, in two modes.
 *
 * "Gần đây" is the old flat `/submissions/recent` feed — useful for triage but blind to
 * which assignment a submission belongs to. "Theo bài tập" lists the lecturer's assignments
 * so grading can be done one assignment at a time, which is how marking actually happens.
 */
export default function LecturerGradingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [mode, setMode] = useState<Mode>('recent')
  const [recent, setRecent] = useState<SubmissionRow[]>([])
  const [exams, setExams] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (kind: 'initial' | 'refresh' = 'initial') => {
      if (kind === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const [rec, asg] = await Promise.allSettled([api.getRecentSubmissions(), api.getAssignments()])
        if (rec.status === 'rejected' && asg.status === 'rejected') {
          throw rec.reason instanceof ApiError ? rec.reason : new Error(t('common.error'))
        }
        setRecent(rec.status === 'fulfilled' ? (rec.value ?? []) : [])
        setExams(asg.status === 'fulfilled' ? (asg.value ?? []) : [])
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

  // Returning from a grading detail must show the row's new state; see the lecturer dashboard.
  const focused = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (!focused.current) {
        focused.current = true
        return
      }
      load('refresh')
    }, [load]),
  )

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

  const MODES: { value: Mode; label: string }[] = [
    { value: 'recent', label: t('byExam.recent') },
    { value: 'byExam', label: t('byExam.byAssignment') },
  ]

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
          <Text style={[styles.title, { color: a.onGlass }]}>{t('lecturer.gradingTitle')}</Text>

          {/* mode switch */}
          <View style={[styles.segment, { backgroundColor: a.glass, borderColor: a.glassBorder }]}>
            {MODES.map((m) => {
              const active = mode === m.value
              return (
                <TouchableOpacity
                  key={m.value}
                  activeOpacity={0.85}
                  onPress={() => setMode(m.value)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.segmentItem, active && { backgroundColor: c.primary }]}
                >
                  <Text
                    style={[styles.segmentText, { color: active ? c.onPrimary : a.onGlassSoft }]}
                    numberOfLines={1}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {mode === 'recent' ? (
            recent.length === 0 ? (
              <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('lecturer.noRecent')}</Text>
            ) : (
              recent.map((item) => (
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
                          {item.className ?? item.assignmentTitle ?? '—'}
                        </Text>
                      </View>
                      <View style={styles.right}>
                        <StatusBadge status={item.status} />
                        <Text style={[styles.score, { color: a.onGlass }]}>{item.score ?? item.aiScore ?? '—'}</Text>
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              ))
            )
          ) : exams.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('learning.noAssignments')}</Text>
          ) : (
            <>
              <Text style={[styles.hint, { color: a.onGlassSoft }]}>{t('byExam.pickAssignment')}</Text>
              {exams.map((asg) => {
                const cd = countdownTo(asg.due)
                return (
                  <TouchableOpacity
                    key={asg.id}
                    activeOpacity={0.85}
                    style={styles.item}
                    onPress={() =>
                      router.push(`/(lecturer)/grading/exam/${asg.id}?title=${encodeURIComponent(asg.title)}` as never)
                    }
                  >
                    <GlassCard>
                      <View style={styles.row}>
                        <View style={styles.left}>
                          <Text style={[styles.name, { color: a.onGlass }]} numberOfLines={2}>
                            {asg.title}
                          </Text>
                          <View style={styles.metaRow}>
                            <StatusBadge status={asg.status} />
                            <Text style={[styles.meta, { color: cd?.urgent ? c.danger : a.onGlassSoft }]}>
                              {asg.due ? (cd ? cd.label : formatDue(asg.due)) : t('assignment.noDue')}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                )
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, gap: 8 },
  title: { ...Type.greeting, fontWeight: '800' },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radius.pill, borderWidth: 1, marginVertical: 8 },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: Radius.pill },
  segmentText: { ...Type.body, fontWeight: '700' },
  hint: { ...Type.body, marginBottom: 2 },
  empty: { ...Type.bodyLg, textAlign: 'center', marginTop: 40 },
  item: { marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  left: { flex: 1, gap: 4 },
  name: { ...Type.bodyLg, fontWeight: '700' },
  meta: { ...Type.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  right: { alignItems: 'flex-end', gap: 4 },
  score: { ...Type.title, fontWeight: '800' },
})
