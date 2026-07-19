import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, useColorScheme, View, type ViewProps } from 'react-native'

import { Aurora, tint } from '@/constants/theme'

/**
 * The app ground for the Aurora Glass redesign: a smooth multi-colour base gradient
 * with two diagonal colour "washes" layered over it. No blur is used — the washes
 * fade to `transparent`, so there are no hard edges, and the glass surfaces above
 * read against the colour beneath them. Cheap (3 gradients) and identical on every
 * platform.
 */
export function AuroraBackground({ children, style, ...rest }: ViewProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const a = Aurora[scheme]
  const dark = scheme === 'dark'

  return (
    <View {...rest} style={[styles.fill, { backgroundColor: a.base }, style]}>
      <LinearGradient
        colors={a.ground}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* subtle warm wash from the top-left (kept low so the ground reads clean/basic) */}
      <LinearGradient
        colors={[tint(a.washA, dark ? 0.28 : 0.16), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.55 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* subtle cool wash from the bottom-right */}
      <LinearGradient
        colors={['transparent', tint(a.washC, dark ? 0.26 : 0.14)]}
        start={{ x: 0.3, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
