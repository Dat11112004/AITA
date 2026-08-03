import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Aurora, Layout, Type } from '@/constants/theme'

/**
 * The back-bar used by every pushed screen, lifted verbatim from the geometry the profile
 * screen already used (40×40 glass circle, centred title, a matching spacer on the right so
 * the title stays optically centred).
 *
 * `fallback` matters because these routes are reachable with an empty back-stack — a deep
 * link, or a reload while running on Expo web. Without it `router.back()` dispatches GO_BACK
 * with nothing to pop and the arrow silently does nothing.
 */
export function ScreenHeader({
  title,
  fallback,
  right,
}: {
  title: string
  fallback: string
  right?: ReactNode
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const a = Aurora[scheme]
  const router = useRouter()

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace(fallback as never)
  }

  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        onPress={goBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        style={[styles.iconBtn, { backgroundColor: a.glass, borderColor: a.glassBorder }]}
      >
        <Ionicons name="chevron-back" size={20} color={a.onGlass} />
      </TouchableOpacity>

      <Text style={[styles.topTitle, { color: a.onGlass }]} numberOfLines={1}>
        {title}
      </Text>

      {/* Khoảng đệm để tiêu đề nằm đúng giữa. Phải dùng style riêng: `iconBtn` có
          borderWidth, mà ở đây không truyền borderColor nên nó vẽ ra một vòng tròn thừa. */}
      {right ? <View style={styles.right}>{right}</View> : <View style={styles.spacer} />}
    </View>
  )
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: Layout.screenPad,
    paddingTop: 4,
    paddingBottom: 6,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 40, height: 40 },
  topTitle: { ...Type.title, fontWeight: '800', flex: 1, textAlign: 'center' },
  right: { minWidth: 40, alignItems: 'flex-end' },
})
