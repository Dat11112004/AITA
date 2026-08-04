import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native'

import { Colors } from '@/constants/theme'

// Entry route. The root layout redirects to /login or /(student)/dashboard once auth state resolves.
export default function Index() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors[scheme].primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
