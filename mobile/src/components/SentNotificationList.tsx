import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, RefreshControl, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { Aurora, Colors, Layout, Radius, Type } from '@/constants/theme'
import { api, ApiError, type SentNotification } from '@/lib/api'
import { formatDue } from '@/lib/countdown'

/**
 * What this lecturer has sent.
 *
 * The inbox cannot show it: a broadcast creates recipient rows for the students, never for the
 * sender, so everything sent used to vanish the moment it left. `recipientCount` is shown per
 * row because sending to a class with no enrolled students succeeds and reaches nobody, and
 * `classCode` because one send to several classes writes one row per class.
 *
 * Mirrors NotificationList's header so the two tabs of the notification screen line up.
 */
export function SentNotificationList({
  headerRight,
  belowHeader,
}: {
  headerRight?: React.ReactNode
  belowHeader?: React.ReactNode
}) {
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

  if (loading && rows.length === 0) {
    return (
      <AuroraBackground>
        <Loading />
      </AuroraBackground>
    )
  }
  if (error && rows.length === 0) {
    return (
      <AuroraBackground>
        <ErrorView message={error} onRetry={() => load('initial')} />
      </AuroraBackground>
    )
  }

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <FlatList
          data={rows}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} colors={[c.primary]} />
          }
          ListHeaderComponent={
            <View style={styles.head}>
              <View style={styles.headTop}>
                <Text style={[styles.screenTitle, { color: a.onGlass }]}>{t('notify.title')}</Text>
                {headerRight ?? null}
              </View>
              <Text style={[styles.subtitle, { color: a.onGlassSoft }]}>
                {t('notify.sentCountLabel', { count: rows.length })}
              </Text>
              {belowHeader ? <View style={styles.belowHeader}>{belowHeader}</View> : null}
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <EmptyState
              icon="paper-plane-outline"
              title={t('notify.sentEmpty')}
              hint={t('notify.sentEmptyHint')}
            />
          }
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
                  {item.classCode ? (
                    <View style={[styles.classChip, { borderColor: a.glassBorder, backgroundColor: a.glass }]}>
                      <Ionicons name="school-outline" size={12} color={a.onGlassSoft} />
                      <Text style={[styles.metaText, { color: a.onGlassSoft }]} numberOfLines={1}>
                        {item.classCode}
                      </Text>
                    </View>
                  ) : null}
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
  head: { marginBottom: 16, gap: 6 },
  headTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  screenTitle: { ...Type.greeting, fontWeight: '800' },
  subtitle: { ...Type.body, fontWeight: '600' },
  belowHeader: { marginTop: 8 },
  sep: { height: 12 },
  title: { ...Type.bodyLg, fontWeight: '800' },
  message: { ...Type.body, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  metaText: { ...Type.chip },
  classChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 150,
  },
})
