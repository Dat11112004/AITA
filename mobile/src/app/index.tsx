import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { BrandTint } from '@/constants/theme'

// Entry route. The root layout redirects to /login or /(student)/dashboard once auth state resolves.
export default function Index() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={BrandTint} />
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
