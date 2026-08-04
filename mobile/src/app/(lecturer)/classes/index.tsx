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
              <Text style={[styles.title, { color: a.onGlass }]}>{t('lecturer.classesTitle')}</Text>
              <Text style={[styles.subtitle, { color: a.onGlassSoft }]}>{t('lecturer.classCount', { count: rows.length })}</Text>
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
