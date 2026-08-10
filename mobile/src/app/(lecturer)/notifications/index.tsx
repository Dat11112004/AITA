import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, useColorScheme } from 'react-native'

import { EmptyState } from '@/components/EmptyState'
import { NotificationList } from '@/components/NotificationList'
import { NotificationTabs, type NotificationTab } from '@/components/NotificationTabs'
import { SentNotificationList } from '@/components/SentNotificationList'
import { Colors, Radius, Type } from '@/constants/theme'

/**
 * The lecturer's notification screen: their inbox and what they have sent, as two tabs of
 * one screen.
 *
 * "Đã gửi" used to be a separate pushed page reached by a small button, which is backwards:
 * a lecturer's inbox is almost always empty — a broadcast writes recipient rows for the
 * students and none for the sender — so the screen led with nothing and hid the only part
 * that had content. The empty inbox now says why it is empty and points at the other tab.
 */
export default function LecturerNotificationsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]

  const [tab, setTab] = useState<NotificationTab>('inbox')

  const compose = (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/(lecturer)/notifications/broadcast' as never)}
      accessibilityRole="button"
      style={[styles.compose, { backgroundColor: c.primary }]}
    >
      <Ionicons name="create-outline" size={16} color={c.onPrimary} />
      <Text style={[styles.composeText, { color: c.onPrimary }]}>{t('notify.broadcast')}</Text>
    </TouchableOpacity>
  )

  const tabs = <NotificationTabs value={tab} onChange={setTab} />

  if (tab === 'sent') {
    return <SentNotificationList headerRight={compose} belowHeader={tabs} />
  }

  return (
    <NotificationList
      headerRight={compose}
      belowHeader={tabs}
      emptyState={
        <EmptyState
          icon="mail-open-outline"
          title={t('notify.empty')}
          hint={t('notify.lecturerEmptyHint')}
          actionLabel={t('notify.viewSent')}
          onAction={() => setTab('sent')}
        />
      }
    />
  )
}

const styles = StyleSheet.create({
  compose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  composeText: { ...Type.body, fontWeight: '700' },
})
