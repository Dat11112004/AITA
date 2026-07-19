import { StyleSheet, Text, useColorScheme, View } from 'react-native'

import { chipColors, Radius, tint, Type } from '@/constants/theme'

/**
 * Subject pill, transcribed from the Figma's "Physics" / "Chemistry" / "Maths" chips:
 * fully rounded, explicit background + label colour per subject, 12px/400.
 *
 * Backgrounds are the file's exactly; labels are darkened at the same hue to clear AA —
 * see the ratio table on `Subjects` in constants/theme.ts.
 */
export function SubjectChip({ subject }: { subject: string }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const { chipBg, chipFg } = chipColors(subject, scheme)

  return (
    <View style={[styles.chip, { backgroundColor: chipBg, borderColor: tint(chipFg, 0.28) }]}>
      <View style={[styles.dot, { backgroundColor: chipFg }]} />
      <Text style={[styles.text, { color: chipFg }]} numberOfLines={1}>
        {subject}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: 140,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { ...Type.chip, fontWeight: '700' },
})
