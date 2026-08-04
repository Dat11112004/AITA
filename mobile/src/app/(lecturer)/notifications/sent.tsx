import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, RefreshControl, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Aurora, Colors, Layout, Type } from '@/constants/theme'
import { api, ApiError, type SentNotification } from '@/lib/api'
import { formatDue } from '@/lib/countdown'

/**
 * What this lecturer has sent.
 *
 * The inbox cannot show it: a broadcast creates recipient rows for the students, never for the
 * sender, so everything sent used to vanish the moment it left. `recipientCount` is shown per
 * row because sending to a class with no enrolled students succeeds and reaches nobody.
 */
export default function SentNotificationsScreen() {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [rows, setRows] = useState<SentNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        setRows((await api.getSentNotifications()) ?? [])
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
        <ScreenHeader title={t('notify.sentTitle')} fallback="/(lecturer)/notifications" />
        <FlatList
          data={rows}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('notify.sentEmpty')}</Text>}
          renderItem={({ item }) => {
            const reached = item.recipientCount > 0
            return (
              <GlassCard>
                <Text style={[styles.title, { color: a.onGlass }]} numberOfLines={2}>
                  {item.title ?? '—'}
                </Text>
                {item.message ? (
                  <Text style={[styles.message, { color: a.onGlassSoft }]} numberOfLines={3}>
                    {item.message}
                  </Text>
                ) : null}
                <View style={styles.meta}>
                  <Ionicons
                    name={reached ? 'people-outline' : 'alert-circle-outline'}
                    size={14}
                    color={reached ? a.onGlassSoft : c.danger}
                  />
                  <Text style={[styles.metaText, { color: reached ? a.onGlassSoft : c.danger }]}>
                    {reached ? t('notify.sentTo', { count: item.recipientCount }) : t('notify.sentNobody')}
                  </Text>
                  {item.createdAt ? (
                    <Text style={[styles.metaText, { color: a.onGlassSoft }]}>· {formatDue(item.createdAt)}</Text>
                  ) : null}
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
  sep: { height: 12 },
  title: { ...Type.bodyLg, fontWeight: '800' },
  message: { ...Type.body, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  metaText: { ...Type.chip },
  empty: { ...Type.bodyLg, textAlign: 'center', marginTop: 40 },
})
