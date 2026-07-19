import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, useColorScheme, View, type ViewProps } from 'react-native'

import { Aurora, Layout, Radius } from '@/constants/theme'

/**
 * A frosted-glass surface. Translucent fill over the Aurora ground + a light
 * hairline border + a top sheen gradient — reads as glass without a blur module,
 * so it works in Expo Go on any platform. `strong` bumps opacity for surfaces
 * that carry a lot of text (e.g. the assignment detail body).
 */
export function GlassCard({
  style,
  children,
  strong,
  radius = Radius.card,
  padded = true,
  glow,
  ...rest
}: ViewProps & { strong?: boolean; radius?: number; padded?: boolean; glow?: boolean }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const a = Aurora[scheme]

  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          borderRadius: radius,
          backgroundColor: strong ? a.glassStrong : a.glass,
          borderColor: a.glassBorder,
          padding: padded ? Layout.cardPad : 0,
          shadowColor: a.shadow,
          shadowOpacity: glow ? a.shadowOpacity + 0.06 : a.shadowOpacity,
          shadowRadius: glow ? 22 : 16,
        },
        style,
      ]}
    >
      {/* top-to-transparent sheen — the "light catching the glass" */}
      <LinearGradient
        colors={[a.sheen, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        pointerEvents="none"
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    // NOTE: no `overflow: 'hidden'` here — on iOS that sets masksToBounds and kills the
    // drop shadow. The sheen self-clips via its own matching borderRadius instead.
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
})
