import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, RefreshControl, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AssignmentCard } from '@/components/AssignmentCard'
import { ErrorView } from '@/components/ErrorView'
import { Loading } from '@/components/Loading'
import { BrandTint, Colors } from '@/constants/theme'
import { api, ApiError, type AssignmentRow } from '@/lib/api'
import { DEV_PREVIEW, mockAssignments } from '@/lib/devPreview'

export default function AssignmentsListScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]

  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        if (DEV_PREVIEW) setRows(mockAssignments)
        else setRows((await api.getAssignments()) ?? [])
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
      <View style={[styles.fill, { backgroundColor: c.background }]}>
        <Loading />
      </View>
    )
  }
  if (error) {
    return (
      <View style={[styles.fill, { backgroundColor: c.background }]}>
        <ErrorView message={error} onRetry={() => load('initial')} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: c.background }]}>
      <FlatList
        data={rows}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={BrandTint} colors={[BrandTint]} />
        }
        renderItem={({ item }) => (
          <AssignmentCard assignment={item} onPress={() => router.push(`/(student)/assignments/${item.id}` as any)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<Text style={[styles.empty, { color: c.textSecondary }]}>{t('assignments.empty')}</Text>}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, flexGrow: 1 },
  sep: { height: 10 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
})
