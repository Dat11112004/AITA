import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, RefreshControl, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { Aurora, Colors, Layout, Type } from '@/constants/theme'
import { api, ApiError, type StudentRow } from '@/lib/api'

export default function LecturerClassDetailScreen() {
  const { t } = useTranslation()
  const { id, code, name } = useLocalSearchParams<{ id: string; code?: string; name?: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        setRows((await api.getClassStudents(String(id))) ?? [])
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
              <View style={styles.headSpacer} />
              <Text style={[styles.code, { color: a.onGlass }]}>{code ?? '—'}</Text>
              {name ? <Text style={[styles.name, { color: a.onGlassSoft }]}>{name}</Text> : null}
              <Text style={[styles.section, { color: a.onGlass }]}>
                {t('lecturer.studentsTitle')} · {t('lecturer.studentCount', { count: rows.length })}
              </Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('lecturer.noStudents')}</Text>}
          renderItem={({ item }) => {
            const initial = (item.fullName?.trim()[0] ?? '?').toUpperCase()
            return (
              <GlassCard style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: a.glassStrong, borderColor: a.glassBorder }]}>
                    <Text style={[styles.avatarText, { color: c.primary }]}>{initial}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.sName, { color: a.onGlass }]} numberOfLines={1}>{item.fullName}</Text>
                    <Text style={[styles.sMeta, { color: a.onGlassSoft }]} numberOfLines={1}>
                      {item.studentCode ? `${item.studentCode} · ` : ''}{item.email}
                    </Text>
                  </View>
                  <Ionicons name="ellipse" size={9} color={(item.status ?? '').toLowerCase() === 'active' ? c.success : a.onGlassSoft} />
                </View>
              </GlassCard>
            )
          }}
        />
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, flexGrow: 1 },
  head: { marginBottom: 10, gap: 3 },
  headSpacer: { height: 40 },
  code: { ...Type.greeting, fontWeight: '800' },
  name: { ...Type.bodyLg },
  section: { ...Type.title, fontWeight: '800', marginTop: 16 },
  sep: { height: 10 },
  empty: { ...Type.bodyLg, textAlign: 'center', marginTop: 40 },
  card: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  info: { flex: 1, gap: 2 },
  sName: { ...Type.bodyLg, fontWeight: '700' },
  sMeta: { ...Type.body },
})
