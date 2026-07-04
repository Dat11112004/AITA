---
name: aita-mobile-auth
description: Use when handling auth or token storage in the AITA mobile app — the secure-store wrapper, AuthContext (login/logout/me), and the access+refresh token lifecycle against BE V2.
---

# AITA Mobile — Auth & Secure Store

Tokens live in **expo-secure-store** (encrypted keychain) — the mobile equivalent of the web's `localStorage`. Never put tokens in plain `AsyncStorage`.

## Secure store wrapper (`src/lib/secureStore.ts`)
Keys `aita_token` / `aita_refresh` / `aita_user`. Native uses SecureStore; web (`expo start --web`) falls back to `localStorage` so previews don't crash:
```ts
async function getItem(key: Key): Promise<string | null> {
  if (Platform.OS === 'web') { try { return globalThis.localStorage?.getItem(key) ?? null } catch { return null } }
  return SecureStore.getItemAsync(key)
}
export const secureStore = { getToken, setToken, getRefresh, setRefresh, getUser, setUser, clear }
```

## AuthContext (`src/store/AuthContext.tsx`)
Mirrors the web AuthContext: boot-time `me()`, `login`, `logout`. Exposes `status: 'loading' | 'authed' | 'guest'` which the root layout uses to gate navigation.
```tsx
useEffect(() => { (async () => {                 // boot
  const token = await secureStore.getToken()
  if (!token) return setStatus('guest')
  try { setUser(await api.me()); setStatus('authed') }
  catch { await secureStore.clear(); setStatus('guest') }
})() }, [])

const login = useCallback(async (email, password) => {
  const res = await api.login(email, password)   // BE V2 → { token, refreshToken, user }
  await secureStore.setToken(res.token)
  if (res.refreshToken) await secureStore.setRefresh(res.refreshToken)
  await secureStore.setUser(res.user)
  setUser(res.user); setStatus('authed')
}, [])

const logout = useCallback(async () => {
  const rt = await secureStore.getRefresh()
  if (rt) { try { await api.logout(rt) } catch {} } // best-effort server-side revoke
  await secureStore.clear(); setUser(null); setStatus('guest')
}, [])
```
`useAuth()` throws outside the provider.

## Token lifecycle (BE Auth V2)
- **Access token** = JWT (Bearer header). **Refresh token** = opaque, stored separately.
- On a 401 the api client calls `POST /auth/refresh-token` once (rotation: BE returns a new `{ token, refreshToken }`) and retries — see `aita-mobile-data-and-api`.
- **Logout** revokes the refresh token server-side and clears the store.

## Rules
- Roles are UPPERCASE in DB/JWT; the api client lowercases at the boundary (`'student'`). Gate routes by the lowercased role.
- Never log/store the raw password; never trust ownership from local state — the BE enforces it.

See `aita-mobile-data-and-api`, `aita-mobile-navigation`.
