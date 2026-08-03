import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View, type TextInputProps } from 'react-native'

import { Aurora, Colors, Radius, Type } from '@/constants/theme'

/**
 * A form field for the Aurora Glass screens.
 *
 * The grading screen already had this exact treatment inline (uppercase micro label over a
 * translucent field with a hairline glass border); this pulls it out so every new form —
 * edit profile, change password, reset password, broadcast — uses one implementation
 * instead of four copies that drift apart.
 *
 * `error` is rendered under the field rather than replacing it, so the user can still see
 * what they typed while reading what is wrong with it.
 */
export function GlassField({
  label,
  value,
  onChangeText,
  icon,
  secure,
  multiline,
  error,
  hint,
  ...rest
}: TextInputProps & {
  label: string
  icon?: keyof typeof Ionicons.glyphMap
  secure?: boolean
  multiline?: boolean
  error?: string | null
  hint?: string
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]
  const [reveal, setReveal] = useState(false)

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: a.onGlassSoft }]}>{label}</Text>

      <View
        style={[
          styles.box,
          multiline && styles.boxMultiline,
          { backgroundColor: a.glass, borderColor: error ? c.danger : a.glassBorder },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={a.onGlassSoft} /> : null}
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          secureTextEntry={secure && !reveal}
          placeholderTextColor={a.onGlassSoft}
          style={[styles.input, multiline && styles.inputMultiline, { color: a.onGlass }]}
        />
        {secure ? (
          <TouchableOpacity
            onPress={() => setReveal((r) => !r)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
          >
            <Ionicons name={reveal ? 'eye-outline' : 'eye-off-outline'} size={19} color={a.onGlassSoft} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.help, { color: c.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.help, { color: a.onGlassSoft }]}>{hint}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: { ...Type.chip, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  box: {
    minHeight: 52,
    borderRadius: Radius.field,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  boxMultiline: { minHeight: 110, alignItems: 'flex-start', paddingVertical: 13 },
  input: { flex: 1, ...Type.bodyLg, paddingVertical: 0 },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top' },
  help: { ...Type.body },
})
