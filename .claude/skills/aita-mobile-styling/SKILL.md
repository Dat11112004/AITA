---
name: aita-mobile-styling
description: Use when building AITA mobile UI — StyleSheet + the reused brand-* palette, light/dark via useColorScheme, SafeAreaView, Vietnamese strings via i18next. NativeWind is optional/not wired yet.
---

# AITA Mobile — UI & Styling

Styling is **React Native `StyleSheet`** + a shared token set (the "StyleSheet fallback" — NativeWind is optional and not wired yet; see bottom). The **brand palette is the web's `brand-*`** (FPT soft orange/amber), copied 1:1 from `FE/src/styles/index.css` into `src/constants/theme.ts`.

```ts
// src/constants/theme.ts
export const Brand = { 50:'#fffbf5', 100:'#fff3e0', 200:'#ffe0b2', 300:'#ffcc80', 400:'#ffb74d',
  500:'#ffa726', 600:'#fb8c00', 700:'#f57c00', 800:'#e65100', 900:'#bf360c', 950:'#7c2a00' } as const
export const BrandTint = Brand[600]
export const Colors = { light: { text, background, backgroundElement, backgroundSelected, textSecondary }, dark: {...} }
```

## Per-screen pattern (light/dark + brand)
```tsx
const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'   // narrow to a literal key
const c = Colors[scheme]
return (
  <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
    <Text style={{ color: c.text }}>...</Text>
    <TouchableOpacity style={[styles.button, { backgroundColor: Brand[600] }]}>
      <Text style={{ color: '#fff', fontWeight: '700' }}>{t('login.submit')}</Text>
    </TouchableOpacity>
  </SafeAreaView>
)
```
- Use `Brand[600]` for primary actions/accents, `Brand[700]` for emphasis; neutrals from `Colors[scheme]`.
- Wrap screens in `SafeAreaView` (from `react-native-safe-area-context`; root has `SafeAreaProvider`).
- `useColorScheme()` returns a union incl. null — narrow with `=== 'dark' ? 'dark' : 'light'` before indexing `Colors`.

## Vietnamese UI (i18next)
All user-facing strings are **Vietnamese**, via `src/lib/i18n.ts` (i18next, `lng: 'vi'`). Use `const { t } = useTranslation()` and keys (`t('dashboard.logout')`); don't hardcode literals. Add keys under the `vi.translation` tree.

## NativeWind (optional, later)
Not configured yet. To adopt: `npx expo install nativewind tailwindcss react-native-reanimated`, add `tailwind.config.js` (point `content` at `src/**/*`, extend `colors.brand` with the palette above), wrap `metro.config.js` with `withNativeWind`, add the `nativewind/babel` preset + `nativewind-env.d.ts`. Until then, use StyleSheet + `Brand`/`Colors`.

See `aita-mobile-data-and-api`, `aita-mobile-navigation`.
