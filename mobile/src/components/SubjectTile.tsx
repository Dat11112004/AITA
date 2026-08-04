import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Aurora, gradientForSubject, GradientDirection, Radius, tint, Type } from '@/constants/theme'

/**
 * Subject tile, Aurora Glass style: a subject-coloured gradient card with a soft
 * matching glow, a translucent-glass icon chip, and a left-aligned code + name.
 */
export function SubjectTile({
  subject,
  caption,
  onPress,
}: {
  subject: string
  caption?: string
  onPress?: () => void
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const [from, to] = gradientForSubject(subject)

  const body = (
    <View style={[styles.glow, { shadowColor: from }, scheme === 'dark' && { shadowOpacity: 0.5 }]}>
      <LinearGradient
        colors={[from, to]}
        start={GradientDirection.start}
        end={GradientDirection.end}
        locations={GradientDirection.locations}
        style={styles.tile}
      >
        <View style={styles.iconChip}>
          <Ionicons name="book" size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {subject}
        </Text>
        {caption ? (
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </LinearGradient>
    </View>
  )

  if (!onPress) return <View style={styles.wrap}>{body}</View>
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.88} onPress={onPress}>
      {body}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 0, flexBasis: '48%' },
  glow: {
    borderRadius: Radius.card,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tile: {
    minHeight: 92,
    borderRadius: Radius.card,
    padding: 16,
    justifyContent: 'flex-end',
    gap: 3,
    overflow: 'hidden',
  },
  iconChip: {
    position: 'absolute',
    top: 12,
    left: 14,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: tint('#FFFFFF', 0.22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...Type.title, color: '#FFFFFF', fontWeight: '700' },
  caption: { ...Type.chip, color: 'rgba(255,255,255,0.85)' },
})
