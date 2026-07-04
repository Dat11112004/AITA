import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Colors } from '@/constants/theme'
import type { AssignmentRow } from '@/lib/api'

import { Card } from './Card'
import { StatusBadge } from './StatusBadge'

// Shared assignment row — used by the dashboard "upcoming" preview and the assignments list.
export function AssignmentCard({ assignment, onPress }: { assignment: AssignmentRow; onPress?: () => void }) {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]

  const body = (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {assignment.title}
        </Text>
        <StatusBadge status={assignment.status} />
      </View>
      <Text style={[styles.meta, { color: c.textSecondary }]}>
        {assignment.due ? `${t('assignment.due')}: ${assignment.due}` : t('assignment.noDue')}
        {assignment.class ? `  ·  ${assignment.class}` : ''}
      </Text>
    </Card>
  )

  if (!onPress) return body
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {body}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12 },
})
