import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Aurora, Colors, Glow, HeroAurora, Radius, Type } from '@/constants/theme'

/**
 * The gradient call-to-action the login and grading screens already used, extracted so the
 * new forms don't each re-implement the LinearGradient + Glow + spinner combination.
 */
export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  loadingLabel,
  disabled,
}: {
  label: string
  onPress?: () => void
  icon?: keyof typeof Ionicons.glyphMap
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const off = disabled || loading

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={[styles.wrap, Glow.primary, { opacity: off ? 0.5 : 1 }]}
    >
      <LinearGradient colors={HeroAurora[scheme]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.text}>{loadingLabel ?? label}</Text>
          </>
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
            <Text style={styles.text}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}

/**
 * The inline result banner the grading screen used for "đã công bố" / error. Kept as one
 * component so success and failure are always the same shape and never a silent no-op.
 */
export function InlineToast({ text, tone }: { text: string; tone: 'ok' | 'error' | 'info' }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const pair =
    tone === 'ok'
      ? { bg: c.successBg, fg: c.successFg, icon: 'checkmark-circle' as const }
      : tone === 'error'
        ? { bg: c.dangerBg, fg: c.dangerFg, icon: 'alert-circle' as const }
        : { bg: a.glass, fg: a.onGlassSoft, icon: 'information-circle' as const }

  return (
    <View style={[styles.toast, { backgroundColor: pair.bg }]}>
      <Ionicons name={pair.icon} size={16} color={pair.fg} />
      <Text style={[styles.toastText, { color: pair.fg }]}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.card },
  button: {
    height: 56,
    borderRadius: Radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 20,
  },
  text: { ...Type.bodyLg, color: '#FFFFFF', fontWeight: '700' },
  toast: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: Radius.md },
  toastText: { ...Type.body, fontWeight: '600', flex: 1 },
})
