import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { SubjectTile } from '@/components/SubjectTile'
import { Aurora, Colors, gradientForSubject, Layout, Type } from '@/constants/theme'
import { api, ApiError, type ClassRow, type StudentSubject } from '@/lib/api'

/**
 * "Học tập" — the student's two ways of looking at the same enrolment: by subject and by
 * class. Both live on one screen because a student has only a handful of each, and putting
 * them behind separate tabs would mean two taps to answer "who teaches this?".
 */
export default function LearningScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [subjects, setSubjects] = useState<StudentSubject[]>([])
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
        setSubjects((await api.getStudentPortalSubjects()) ?? [])
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
          <Text style={[styles.title, { color: a.onGlass }]}>{t('learning.title')}</Text>

          <Text style={[styles.section, { color: a.onGlass }]}>{t('learning.subjects')}</Text>
          {subjects.length === 0 ? (
            <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('learning.noSubjects')}</Text>
          ) : (
            <View style={styles.gridRow}>
              {subjects.map((s) => (
                <SubjectTile
                  key={s.id}
                  subject={s.code}
                  caption={s.name}
                  onPress={() =>
                    router.push(
                      `/(student)/learning/subject/${s.id}?code=${encodeURIComponent(s.code)}&name=${encodeURIComponent(s.name)}` as never,
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
  content: { padding: Layout.screenPad, paddingBottom: 130, gap: 10 },
  title: { ...Type.greeting, fontWeight: '800', marginBottom: 4 },
  section: { ...Type.title, fontWeight: '800', marginTop: 12 },
  empty: { ...Type.body },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.gridGap },
  classItem: { marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  code: { ...Type.bodyLg, fontWeight: '800' },
  name: { ...Type.body },
})
