import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { StatusBadge } from '@/components/StatusBadge'
import { Aurora, Colors, Layout, Type } from '@/constants/theme'
import { api, ApiError, type SubmissionRow } from '@/lib/api'

export default function LecturerGradingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        setRows((await api.getRecentSubmissions()) ?? [])
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

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <FlatList
          data={rows}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.head}>
              <Text style={[styles.title, { color: a.onGlass }]}>{t('lecturer.gradingTitle')}</Text>
              <Text style={[styles.subtitle, { color: a.onGlassSoft }]}>{rows.length}</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('lecturer.noRecent')}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/(lecturer)/grading/${item.id}` as any)}>
              <GlassCard>
                <View style={styles.row}>
                  <View style={styles.left}>
                    <Text style={[styles.name, { color: a.onGlass }]} numberOfLines={1}>{item.studentName ?? t('lecturer.student')}</Text>
                    <Text style={[styles.meta, { color: a.onGlassSoft }]} numberOfLines={1}>{item.className ?? '—'}</Text>
                  </View>
                  <View style={styles.right}>
                    <StatusBadge status={item.status} />
                    <Text style={[styles.score, { color: a.onGlass }]}>{item.score ?? item.aiScore ?? '—'}</Text>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, flexGrow: 1 },
  head: { marginBottom: 16, gap: 3, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { ...Type.greeting, fontWeight: '800' },
  subtitle: { ...Type.title, fontWeight: '800' },
  sep: { height: 12 },
  empty: { ...Type.bodyLg, textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  left: { flex: 1, gap: 3 },
  name: { ...Type.bodyLg, fontWeight: '700' },
  meta: { ...Type.body },
  right: { alignItems: 'flex-end', gap: 4 },
  score: { ...Type.title, fontWeight: '800' },
})
