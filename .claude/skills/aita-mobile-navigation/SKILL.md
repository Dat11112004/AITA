---
name: aita-mobile-navigation
description: Use when adding screens, routes, or role-gating in the AITA mobile app — expo-router file-based routing, role groups, the root auth-redirect, bottom Tabs, and nested Stack layouts.
---

# AITA Mobile — Navigation (expo-router)

File-based routing under `src/app/`. A file = a route; `_layout.tsx` = a layout for its folder; **`(group)` folders are NOT part of the URL** (used to group screens + share a layout, e.g. role areas).

## Root layout = providers + auth gating
`src/app/_layout.tsx` wraps the app in `SafeAreaProvider` + `AuthProvider`, then redirects by auth state (Student v1):
```tsx
function RootNavigator() {
  const { status } = useAuth()           // 'loading' | 'authed' | 'guest'
  const segments = useSegments()
  const router = useRouter()
  useEffect(() => {
    if (status === 'loading') return
    const inStudent = segments[0] === '(student)'
    if (status === 'authed' && !inStudent) router.replace('/(student)/dashboard' as any)
    else if (status === 'guest' && segments[0] !== 'login') router.replace('/login' as any)
  }, [status, segments, router])
  return <Stack screenOptions={{ headerShown: false }} />
}
export default function RootLayout() {
  return (
    <SafeAreaProvider><AuthProvider><RootNavigator /></AuthProvider></SafeAreaProvider>
  )
}
```
`src/app/index.tsx` is just a spinner — the effect above sends guests to `/login` and authed users into `(student)`.

## Role area = bottom Tabs (with nested Stacks per tab)
`src/app/(student)/_layout.tsx` is a **Tabs** navigator (`Tabs`/`Tabs.Screen` from `expo-router`). Each `Tabs.Screen name` maps to a file (`dashboard.tsx`) or a folder (`assignments/`); a folder gets its own nested `_layout`. Icons come from `@expo/vector-icons` (`Ionicons`):
```tsx
export default function StudentLayout() {
  const { t } = useTranslation()
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light']
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: Brand[600], tabBarInactiveTintColor: c.textSecondary,
      headerStyle: { backgroundColor: Brand[600] }, headerTintColor: '#fff' }}>
      <Tabs.Screen name="dashboard" options={{ title: t('appName'), tabBarLabel: t('tabs.home'),
        tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="assignments" options={{ headerShown: false, tabBarLabel: t('tabs.assignments'),
        tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'document-text' : 'document-text-outline'} color={color} size={size} /> }} />
    </Tabs>
  )
}
```
A tab that owns a flow (list → detail) is a **folder with a Stack**: `src/app/(student)/assignments/_layout.tsx` is a `Stack` over `index.tsx` (list) + `[id].tsx` (detail). Set `headerShown: false` on that tab so the nested Stack owns the header (avoids a double header).

## Rules
- **Add a tab:** drop `src/app/(student)/<name>.tsx` (or a `<name>/` folder with its own Stack), then add a matching `<Tabs.Screen name="<name>" …/>` to the student `_layout` with a `tabBarLabel` + `tabBarIcon`. Without a `Tabs.Screen` entry the file still routes but gets no tab button.
- **Add a screen inside a tab's flow:** drop a file in that tab's folder (e.g. `src/app/(student)/assignments/<name>.tsx`) and register a `<Stack.Screen>` in the folder's `_layout` for its header title. Dynamic route = `[id].tsx`, read via `useLocalSearchParams<{ id: string }>()`.
- **Navigate:** `useRouter().push('/(student)/assignments' as any)` / `.replace(...)`. Typed routes are on (`app.json` → `typedRoutes`) but the generated `Href` types only exist after `expo start`/build — cast hrefs `as any` to keep `tsc` green before generation.
- **Read current location:** `useSegments()` (includes the `(student)` group segment) — that's what the root gate checks.
- Future roles (lecturer/admin) = sibling groups `(lecturer)`, `(admin)` with the same gating pattern.

See `aita-mobile-auth`, `aita-mobile-project-structure`.
