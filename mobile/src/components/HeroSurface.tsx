import { StyleSheet, View, type ViewProps } from 'react-native'

import { HeroPanel, Radius } from '@/constants/theme'

/**
 * The Figma's hero surface: a solid #495ECA panel with two rotated ellipses floating over
 * it (#C05AFF at 30%, and #2F68D7), clipped to the shape. The "gradient" look of that card
 * comes from these ellipses — there is no gradient fill.
 *
 * Extracted so the dashboard hero and the login background share one definition; the
 * ellipse geometry is fiddly and should not exist twice.
 *
 * `variant="card"` — the Figma's 122pt hero card, ellipse geometry transcribed exactly.
 * `variant="full"` — the same treatment scaled to fill a screen. DEVIATION: the Figma has
 * no full-bleed surface, so the ellipses are scaled ~3× and re-anchored to the corners,
 * holding the original −30.81° rotation and the same two colours.
 */
export function HeroSurface({
  style,
  children,
  variant = 'card',
  ...rest
}: ViewProps & { variant?: 'card' | 'full' }) {
  const full = variant === 'full'
  return (
    <View {...rest} style={[full ? styles.full : styles.panel, style]}>
      <View style={full ? styles.ellipseBFull : styles.ellipseB} />
      <View style={full ? styles.ellipseAFull : styles.ellipseA} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radius.card,
    backgroundColor: HeroPanel.bg,
    overflow: 'hidden', // clips the ellipses to the radius
  },
  full: {
    flex: 1,
    backgroundColor: HeroPanel.bg,
    overflow: 'hidden',
  },

  // ── card: transcribed from the export (÷0.874465)
  // Ellipse 6 (#2F68D7): 238.42×164.3 at (-84.82, -114.55), rotate(-30.81deg)
  ellipseB: {
    position: 'absolute',
    width: 273,
    height: 188,
    left: -97,
    top: -131,
    borderRadius: 999,
    backgroundColor: HeroPanel.ellipseB,
    transform: [{ rotate: HeroPanel.rotate }],
  },
  // Ellipse 6 (#C05AFF @0.3): 261.4×180.13 at (100.56, 19.24), rotate(-30.81deg)
  ellipseA: {
    position: 'absolute',
    width: 299,
    height: 206,
    left: 115,
    top: 22,
    borderRadius: 999,
    backgroundColor: HeroPanel.ellipseA,
    opacity: 0.3,
    transform: [{ rotate: HeroPanel.rotate }],
  },

  // ── full: same colours, rotation and proportions, scaled to a 390×845 screen
  ellipseBFull: {
    position: 'absolute',
    width: 780,
    height: 540,
    left: -300,
    top: -380,
    borderRadius: 999,
    backgroundColor: HeroPanel.ellipseB,
    transform: [{ rotate: HeroPanel.rotate }],
  },
  ellipseAFull: {
    position: 'absolute',
    width: 860,
    height: 590,
    left: 30,
    top: 400,
    borderRadius: 999,
    backgroundColor: HeroPanel.ellipseA,
    opacity: 0.3,
    transform: [{ rotate: HeroPanel.rotate }],
  },
})
