import { StyleSheet, useColorScheme, View, type ViewProps } from 'react-native'

import { Colors, Layout, Radius } from '@/constants/theme'

/**
 * Figma card: plain white, radius 20, padding 20 — and NO shadow. It separates from the
 * #F6F6F9 ground by value alone. Dark adds a border, because on a near-black ground a
 * white-less surface with no shadow and no border separates from nothing.
 */
export function Card({ style, ...rest }: ViewProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]

  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderWidth: scheme === 'dark' ? 1 : 0,
        },
        style,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: Layout.cardPad },
})
