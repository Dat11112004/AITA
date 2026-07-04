import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { BrandTint } from '@/constants/theme'

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={BrandTint} />
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
})
