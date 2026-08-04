import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

import { api, ApiError, type AuthUser } from '@/lib/api'
import { DEV_AUTOLOGIN, DEV_LOGIN_EMAIL, DEV_LOGIN_PASSWORD, DEV_PREVIEW, mockUser } from '@/lib/devPreview'
import { secureStore } from '@/lib/secureStore'

// Mirrors the web AuthContext (FE/src/store/AuthContext): login / logout / boot-time me().
type Status = 'loading' | 'authed' | 'guest'

interface AuthState {
  user: AuthUser | null
  status: Status
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Replace the signed-in user after an edit (profile screen). */
  applyUser: (next: AuthUser) => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  // On boot: if a token exists, validate it via /auth/me; otherwise we are a guest.
  useEffect(() => {
    let alive = true
    ;(async () => {
      // Preview mode has no BE. DEV_AUTOLOGIN skips straight to the dashboard; without it we
      // start as a guest so the login screen is actually reachable and reviewable — it used
      // to authenticate here unconditionally, which made login unreachable in mock mode.
      if (DEV_PREVIEW) {
        if (alive) {
          if (DEV_AUTOLOGIN) {
            setUser(mockUser)
            setStatus('authed')
          } else {
            setStatus('guest')
          }
        }
        return
      }
      const token = await secureStore.getToken()
      if (!token) {
        // Dev bypass: real login with the seeded test account so review lands straight
        // on the dashboard with live BE data. Falls back to the login screen on failure.
        if (DEV_AUTOLOGIN) {
          try {
            const res = await api.login(DEV_LOGIN_EMAIL, DEV_LOGIN_PASSWORD)
            await secureStore.setToken(res.token)
            if (res.refreshToken) await secureStore.setRefresh(res.refreshToken)
            await secureStore.setUser(res.user)
            if (alive) {
              setUser(res.user)
              setStatus('authed')
            }
            return
          } catch {
            // BE not running or account missing — behave like a normal guest
          }
        }
        if (alive) setStatus('guest')
        return
      }
      try {
        const me = await api.me()
        if (alive) {
          setUser(me)
          setStatus('authed')
        }
      } catch {
        await secureStore.clear()
        if (alive) {
          setUser(null)
          setStatus('guest')
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // Preview mode: no BE to call. Check against the seeded credentials so the screen's real
    // states — loading, success, and the error card — can all be exercised without a backend.
    // Wrong credentials fail here exactly as they would against the API.
    if (DEV_PREVIEW) {
      await new Promise((r) => setTimeout(r, 600)) // let the loading state actually show
      if (email.toLowerCase() !== DEV_LOGIN_EMAIL.toLowerCase() || password !== DEV_LOGIN_PASSWORD) {
        throw new ApiError('Email hoặc mật khẩu không đúng.', 401)
      }
      setUser(mockUser)
      setStatus('authed')
      return
    }

    const res = await api.login(email, password)
    await secureStore.setToken(res.token)
    if (res.refreshToken) await secureStore.setRefresh(res.refreshToken)
    await secureStore.setUser(res.user)
    setUser(res.user)
    setStatus('authed')
  }, [])

  const logout = useCallback(async () => {
    // Preview mode: nothing was ever stored, and there is no BE to revoke against.
    if (DEV_PREVIEW) {
      setUser(null)
      setStatus('guest')
      return
    }

    const rt = await secureStore.getRefresh()
    if (rt) {
      try {
        await api.logout(rt)
      } catch {
        // best-effort server-side revoke; clear locally regardless
      }
    }
    await secureStore.clear()
    setUser(null)
    setStatus('guest')
  }, [])

  /**
   * Adopt a fresh user object after the profile is edited, and mirror it into secure
   * storage so a cold start shows the new name/avatar instead of the stale cached one.
   */
  const applyUser = useCallback(async (next: AuthUser) => {
    setUser(next)
    if (!DEV_PREVIEW) await secureStore.setUser(next)
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, login, logout, applyUser }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
