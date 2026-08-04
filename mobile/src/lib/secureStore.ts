import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Mobile equivalent of the web's localStorage token store (FE/src/lib/api.ts AUTH_STORAGE_KEYS).
// Native → expo-secure-store (encrypted keychain). Web (expo start --web) → localStorage fallback.
const KEYS = { token: 'aita_token', refresh: 'aita_refresh', user: 'aita_user' } as const
type Key = (typeof KEYS)[keyof typeof KEYS]

const isWeb = Platform.OS === 'web'

async function setItem(key: Key, value: string | null): Promise<void> {
  if (value == null) return removeItem(key)
  if (isWeb) {
    try { globalThis.localStorage?.setItem(key, value) } catch {}
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function getItem(key: Key): Promise<string | null> {
  if (isWeb) {
    try { return globalThis.localStorage?.getItem(key) ?? null } catch { return null }
  }
  return SecureStore.getItemAsync(key)
}

async function removeItem(key: Key): Promise<void> {
  if (isWeb) {
    try { globalThis.localStorage?.removeItem(key) } catch {}
    return
  }
  await SecureStore.deleteItemAsync(key)
}

export const secureStore = {
  getToken: () => getItem(KEYS.token),
  setToken: (v: string | null) => setItem(KEYS.token, v),
  getRefresh: () => getItem(KEYS.refresh),
  setRefresh: (v: string | null) => setItem(KEYS.refresh, v),
  async getUser<T = unknown>(): Promise<T | null> {
    const s = await getItem(KEYS.user)
    return s ? (JSON.parse(s) as T) : null
  },
  setUser: (u: unknown | null) => setItem(KEYS.user, u == null ? null : JSON.stringify(u)),
  async clear(): Promise<void> {
    await Promise.all([removeItem(KEYS.token), removeItem(KEYS.refresh), removeItem(KEYS.user)])
  },
}
