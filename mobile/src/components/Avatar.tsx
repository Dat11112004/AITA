import { Image, Platform, StyleSheet, Text, useColorScheme, View } from 'react-native'

import { Aurora, Colors } from '@/constants/theme'
import { fileUrl } from '@/lib/api'

/**
 * A person's avatar: the uploaded image when there is one, the first letter of their name
 * otherwise. Every place that used to hand-roll an initials circle now goes through here,
 * so uploading a photo in Edit Profile shows up everywhere at once.
 *
 * `expo-image` (already a dependency) is used rather than RN's Image because it caches and
 * degrades to the placeholder on a broken URL instead of rendering an empty box.
 */
export function Avatar({
  name,
  uri,
  size = 44,
  onGradient,
}: {
  name?: string | null
  uri?: string | null
  size?: number
  /** Set when the avatar sits on a coloured hero panel, where glass tokens would vanish. */
  onGradient?: boolean
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const initial = ((name ?? '').trim()[0] ?? '?').toUpperCase()
  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: onGradient ? 'rgba(255,255,255,0.25)' : a.glassStrong,
    borderColor: onGradient ? 'rgba(255,255,255,0.5)' : a.glassBorder,
  }

  // Resolved here rather than at each call site: the server hands back a relative
  // `/uploads/avatars/…` path, which no <Image> can load on its own.
  const src = fileUrl(uri)

  if (src) {
    // On web, react-native-web's <Image> fetched the file (200) but never applied it as the
    // layer's background, so the circle stayed blank. A CSS background is what RNW would have
    // produced anyway, so set it directly and skip the machinery that was dropping it.
    if (Platform.OS === 'web') {
      return (
        <View
          accessibilityLabel={name ?? undefined}
          style={[
            styles.base,
            box,
            { backgroundImage: `url("${src}")`, backgroundSize: 'cover', backgroundPosition: 'center' } as object,
          ]}
        />
      )
    }
    return (
      <Image
        source={{ uri: src }}
        style={[styles.base, box]}
        resizeMode="cover"
        accessibilityLabel={name ?? undefined}
      />
    )
  }

  return (
    <View style={[styles.base, styles.center, box]}>
      <Text style={[styles.text, { fontSize: Math.round(size * 0.42), color: onGradient ? '#FFFFFF' : c.primary }]}>
        {initial}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '800' },
})
