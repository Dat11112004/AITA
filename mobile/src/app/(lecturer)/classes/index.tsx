import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { Aurora, Colors, gradientForSubject, Layout, Type } from '@/constants/theme'
import { api, ApiError, type ClassRow } from '@/lib/api'

export default function LecturerClassesScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [rows, setRows] = useState<ClassRow[]>([])
  const [codeFilter, setCodeFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        setRows((await api.getClasses(1, 50)) ?? [])
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

  // One lecturer teaches the same subject to several cohorts, so the useful cut is by class
  // code (SE17C01, SE18C01…) — that is what tells two otherwise identical rows apart.
  const codes = [...new Set(rows.map((r) => r.code).filter(Boolean))].sort()
  const visible = codeFilter ? rows.filter((r) => r.code === codeFilter) : rows

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <FlatList
          data={visible}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.head}>
              <Text style={[styles.title, { color: a.onGlass }]}>{t('lecturer.classesTitle')}</Text>
              <Text style={[styles.subtitle, { color: a.onGlassSoft }]}>
                {t('lecturer.classCount', { count: visible.length })}
              </Text>

              {codes.length > 1 ? (
                <View style={styles.filters}>
                  {[null, ...codes].map((code) => {
                    const active = codeFilter === code
                    const n = code ? rows.filter((r) => r.code === code).length : rows.length
                    return (
                      <TouchableOpacity
                        key={code ?? '__all'}
                        activeOpacity={0.85}
                        onPress={() => setCodeFilter(code)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        style={[
                          styles.chip,
                          { backgroundColor: active ? c.primarySoft : a.glass, borderColor: active ? c.primary : a.glassBorder },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: active ? c.primary : a.onGlassSoft }]}>
                          {(code ?? t('assignments.filterAll')) + ' · ' + n}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              ) : null}
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('lecturer.noClasses')}</Text>}
          renderItem={({ item }) => {
            const grad = gradientForSubject(item.code)
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/(lecturer)/classes/${item.id}?code=${encodeURIComponent(item.code)}&name=${encodeURIComponent(item.name)}` as any)}
              >
                <GlassCard style={styles.card}>
                  <View style={styles.row}>
                    <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
                      <Ionicons name="school" size={20} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.info}>
                      <Text style={[styles.code, { color: a.onGlass }]} numberOfLines={1}>{item.code}</Text>
                      <Text style={[styles.name, { color: a.onGlassSoft }]} numberOfLines={1}>{item.name}</Text>
                    </View>
                    <View style={styles.count}>
                      <Ionicons name="people-outline" size={14} color={a.onGlassSoft} />
                      <Text style={[styles.countText, { color: a.onGlassSoft }]}>{item.studentCount ?? 0}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
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
  head: { marginBottom: 16, gap: 3 },
  title: { ...Type.greeting, fontWeight: '800' },
  subtitle: { ...Type.body, fontWeight: '600' },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipText: { ...Type.chip, fontWeight: '700' },
  sep: { height: 12 },
  empty: { ...Type.bodyLg, textAlign: 'center', marginTop: 40 },
  card: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  code: { ...Type.title, fontWeight: '800' },
  name: { ...Type.body },
  count: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countText: { ...Type.body, fontWeight: '700' },
})
