import { Ionicons } from '@expo/vector-icons'
import { useRef, useState } from 'react'
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native'

import { Login, Radius, Type } from '@/constants/theme'

/**
 * Port of gtsm-app's `AnimatedTextField` (presentation/screen/LoginScreen.kt).
 *
 * gtsm wraps an OutlinedTextField in a white Card and animates two things on focus:
 *   border  Gray200 1dp → action 2dp    (animateColorAsState, tween 200)
 *   shadow  2dp → 8dp                   (animateDpAsState, tween 200)
 * The field's own outline is transparent; the Card's border does the work. Label and
 * leading icon also swap colour on focus.
 *
 * React Native can't animate shadow elevation smoothly, so the 2→8dp lift is expressed as
 * an animated opacity on the shadow. The 200ms timing and every colour are gtsm's.
 */
export function LoginField({
  label,
  icon,
  value,
  onChangeText,
  secure,
  ...rest
}: TextInputProps & {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  secure?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [reveal, setReveal] = useState(false)
  const anim = useRef(new Animated.Value(0)).current

  const to = (v: number) =>
    Animated.timing(anim, { toValue: v, duration: 200, useNativeDriver: false }).start()

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderWidth: focused ? 2 : 1,
          borderColor: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [Login.gray200, Login.action],
          }),
          shadowOpacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.16] }),
          shadowRadius: anim.interpolate({ inputRange: [0, 1], outputRange: [3, 10] }),
        },
      ]}
    >
      <Text style={[styles.label, { color: focused ? Login.action : Login.gray500 }]}>{label}</Text>

      <View style={styles.row}>
        <Ionicons name={icon} size={20} color={focused ? Login.blue700 : Login.gray400} />
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setFocused(true)
            to(1)
          }}
          onBlur={() => {
            setFocused(false)
            to(0)
          }}
          secureTextEntry={secure && !reveal}
          placeholderTextColor={Login.gray400}
          style={[styles.input, noFocusRing]}
        />
        {secure ? (
          <TouchableOpacity
            onPress={() => setReveal((r) => !r)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
          >
            <Ionicons name={reveal ? 'eye-outline' : 'eye-off-outline'} size={20} color={Login.blue700} />
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  )
}

/**
 * React Native Web renders TextInput as a DOM <input>, which paints the user-agent focus ring
 * (measured: outline-style `auto`, rgb(16,16,16)) on top of the card's animated border — a
 * hard black box around the text.
 *
 * Suppressing a focus ring is normally an accessibility regression, so it is only safe here
 * because focus stays clearly visible by other means: the card's border goes 1px #E5E7EB →
 * 2px #495ECA, and the label and leading icon both change colour. Web-only; native draws no
 * such outline. `outlineStyle` isn't in React Native's style types, hence the cast.
 */
const noFocusRing =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null

const styles = StyleSheet.create({
  // gtsm: Card radius 16, white, with the animated border carrying focus.
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.field,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: { ...Type.chip, fontWeight: '500', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // gtsm sets focused/unfocusedTextColor to Black explicitly.
  input: { flex: 1, ...Type.bodyLg, color: '#000000', paddingVertical: 6 },
})
