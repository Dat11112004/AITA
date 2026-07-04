import { StyleSheet, Text, useColorScheme, View } from 'react-native'

import { Brand, Colors } from '@/constants/theme'

export function StatCard({ label, value }: { label: string; value: string | number }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  return (
    <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
      <Text style={[styles.value, { color: Brand[700] }]}>{String(value)}</Text>
      <Text style={[styles.label, { color: c.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: '47%', borderRadius: 14, padding: 14, gap: 4 },
  value: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '600' },
})
