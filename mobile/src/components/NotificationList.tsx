import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { Avatar } from '@/components/Avatar'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { InlineToast } from '@/components/PrimaryButton'
import { SubjectChip } from '@/components/SubjectChip'
import { Aurora, Colors, Layout, Radius, Type } from '@/constants/theme'
import { formatDue } from '@/lib/countdown'
import { useNotifications } from '@/store/NotificationsContext'

/**
 * The notification inbox, shared by both roles — the two tabs differ only in what sits in
 * the header, so the list itself lives here rather than being copy-pasted twice.
 *
 * An unread row is marked by a filled dot AND a heavier title, so the state survives a
 * greyscale screenshot or a colour-blind reader.
 */
export function NotificationList({
  headerRight,
  belowHeader,
  emptyState,
}: {
  headerRight?: React.ReactNode
  /** Slot under the header — the lecturer screen puts its inbox/sent tabs here. */
  belowHeader?: React.ReactNode
  /**
   * Replaces the one-line "no notifications" text, which reads as a screen that failed.
   * A ReactElement, not a ReactNode — FlatList's ListEmptyComponent will not take a string.
   */
  emptyState?: React.ReactElement
}) {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const { items, unread, loading, error, refresh, markRead, markAllRead, remove } = useNotifications()
  const [refreshing, setRefreshing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const onRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const onDelete = async (id: string) => {
    setActionError(null)
    try {
      await remove(id)
    } catch {
      setActionError(t('notify.actionError'))
    }
  }

  if (loading && items.length === 0) {
    return (
      <AuroraBackground>
        <Loading />
      </AuroraBackground>
    )
  }
  if (error && items.length === 0) {
    return (
      <AuroraBackground>
        <ErrorView message={error} onRetry={refresh} />
      </AuroraBackground>
    )
  }

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />
          }
          ListHeaderComponent={
            <View style={styles.head}>
              <View style={styles.headTop}>
                <Text style={[styles.title, { color: a.onGlass }]}>{t('notify.title')}</Text>
                {headerRight ?? null}
              </View>
              <View style={styles.headRow}>
                <Text style={[styles.subtitle, { color: a.onGlassSoft }]}>
                  {unread > 0 ? t('notify.unread', { count: unread }) : t('notify.allRead')}
                </Text>
                {unread > 0 ? (
                  <TouchableOpacity onPress={markAllRead} hitSlop={8} accessibilityRole="button">
                    <Text style={[styles.action, { color: c.primary }]}>{t('notify.markAll')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {actionError ? (
                <View style={styles.toast}>
                  <InlineToast text={actionError} tone="error" />
                </View>
              ) : null}
              {belowHeader ? <View style={styles.belowHeader}>{belowHeader}</View> : null}
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            emptyState ?? <Text style={[styles.empty, { color: a.onGlassSoft }]}>{t('notify.empty')}</Text>
          }
          // Vùng bấm nằm CẠNH nút xoá, không bọc ngoài nó: trên web mỗi
          // TouchableOpacity là một <button>, lồng nhau là HTML không hợp lệ.
          renderItem={({ item }) => (
            <GlassCard strong={!item.read}>
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: item.read ? 'transparent' : c.primary }]} />

                <TouchableOpacity
                  style={styles.body}
                  activeOpacity={0.85}
                  onPress={() => !item.read && markRead(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !item.read }}
                >
                  <Text
                    style={[styles.itemTitle, { color: a.onGlass, fontWeight: item.read ? '600' : '800' }]}
                    numberOfLines={2}
                  >
                    {item.title ?? '—'}
                  </Text>
                  {item.message ? (
                    <Text style={[styles.message, { color: a.onGlassSoft }]} numberOfLines={3}>
                      {item.message}
                    </Text>
                  ) : null}

                  {/* Who it came from and what it is about. The subject used to be readable
                      only by parsing it out of the "[DBI202] …" title, the class was not shown
                      at all, and the sender arrived as a bare uuid. */}
                  {item.classCode || item.subjectCode ? (
                    <View style={styles.chips}>
                      {item.subjectCode ? <SubjectChip subject={item.subjectCode} /> : null}
                      {item.classCode ? (
                        <View style={[styles.classChip, { borderColor: a.glassBorder, backgroundColor: a.glass }]}>
                          <Ionicons name="people-outline" size={12} color={a.onGlassSoft} />
                          <Text style={[styles.classText, { color: a.onGlassSoft }]} numberOfLines={1}>
                            {item.classCode}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.footer}>
                    {item.sender?.name ? (
                      <View style={styles.sender}>
                        <Avatar name={item.sender.name} uri={item.sender.avatar} size={18} />
                        <Text style={[styles.time, { color: a.onGlassSoft }]} numberOfLines={1}>
                          {item.sender.name}
                        </Text>
                      </View>
                    ) : null}
                    {item.createdAt ? (
                      <Text style={[styles.time, { color: a.onGlassSoft }]}>{formatDue(item.createdAt)}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onDelete(item.id)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('notify.delete')}
                >
                  <Ionicons name="trash-outline" size={18} color={a.onGlassSoft} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}
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
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { ...Type.greeting, fontWeight: '800' },
  subtitle: { ...Type.body, fontWeight: '600' },
  action: { ...Type.body, fontWeight: '700' },
  toast: { marginTop: 4 },
  belowHeader: { marginTop: 8 },
  sep: { height: 10 },
  empty: { ...Type.bodyLg, textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  body: { flex: 1, gap: 4 },
  itemTitle: { ...Type.bodyLg },
  message: { ...Type.body, lineHeight: 19 },
  chips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
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
  classText: { ...Type.chip, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  sender: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  time: { ...Type.chip, marginTop: 2 },
  toastWrap: { borderRadius: Radius.md },
})
