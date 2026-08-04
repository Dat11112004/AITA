import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Colors, Layout, Radius, Type } from '@/constants/theme'

// Mobile counterpart of the web's ErrorState/APIError — message + retry, never a silent failure.
export function ErrorView({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  return (
    <View style={styles.wrap}>
      <Text style={[styles.msg, { color: c.text }]}>{message ?? t('common.error')}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} activeOpacity={0.8} style={[styles.btn, { borderColor: c.primary }]}>
          <Text style={[styles.btnText, { color: c.primary }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  msg: { ...Type.bodyLg, textAlign: 'center' },
  btn: { borderWidth: 1, borderRadius: Radius.card, paddingHorizontal: Layout.cardPad, paddingVertical: 12 },
  btnText: { ...Type.bodyLg, fontWeight: '500' },
})
