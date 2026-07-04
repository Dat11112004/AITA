import { StyleSheet, useColorScheme, View, type ViewProps } from 'react-native'

import { Colors } from '@/constants/theme'

export function Card({ style, ...rest }: ViewProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  return <View {...rest} style={[styles.card, { backgroundColor: Colors[scheme].backgroundElement }, style]} />
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16 },
})
