import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { NotificationList } from '@/components/NotificationList'
import { Aurora, Colors, Radius, Type } from '@/constants/theme'

/**
 * The lecturer inbox. Same list as the student's, plus the two affordances a lecturer needs:
 * composing a broadcast, and reviewing what they already sent — the inbox cannot show the
 * latter, because a broadcast creates recipient rows for the students and none for the sender.
 */
export default function LecturerNotificationsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  return (
    <NotificationList
      headerRight={
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(lecturer)/notifications/sent' as never)}
            accessibilityRole="button"
            style={[styles.ghost, { borderColor: a.glassBorder, backgroundColor: a.glass }]}
          >
            <Ionicons name="paper-plane-outline" size={15} color={a.onGlassSoft} />
            <Text style={[styles.ghostText, { color: a.onGlassSoft }]}>{t('notify.viewSent')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(lecturer)/notifications/broadcast' as never)}
            accessibilityRole="button"
            style={[styles.compose, { backgroundColor: c.primary }]}
          >
            <Ionicons name="create-outline" size={16} color={c.onPrimary} />
            <Text style={[styles.composeText, { color: c.onPrimary }]}>{t('notify.broadcast')}</Text>
          </TouchableOpacity>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  ghostText: { ...Type.chip, fontWeight: '700' },
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
