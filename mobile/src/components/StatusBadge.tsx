import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'

// Maps an assignment/submission status (UPPERCASE from BE) → a Vietnamese label + color.
const COLORS: Record<string, { bg: string; fg: string }> = {
  PUBLISHED: { bg: '#dcfce7', fg: '#166534' },
  CLOSED: { bg: '#e5e7eb', fg: '#374151' },
  DRAFT: { bg: '#fef3c7', fg: '#92400e' },
  PENDING_AI_REVIEW: { bg: '#ffedd5', fg: '#9a3412' },
}

export function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation()
  const key = (status ?? '').toUpperCase()
  const col = COLORS[key] ?? { bg: '#e5e7eb', fg: '#374151' }
  const label = t(`status.${key}`, { defaultValue: status ?? '—' })
  return (
    <View style={[styles.badge, { backgroundColor: col.bg }]}>
      <Text style={[styles.text, { color: col.fg }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
})
