import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService, type CurrentUser } from '@/features/auth/services/authService'
import type { UserRole } from '@/types'

interface AuthContextValue {
  user: CurrentUser | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<UserRole>
  logout: () => void
  error: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): CurrentUser | null {
  const raw = localStorage.getItem('aita_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as CurrentUser
  } catch {
    localStorage.removeItem('aita_user')
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aita_token'))
  const [user, setUser] = useState<CurrentUser | null>(() => readStoredUser())
  const [loading, setLoading] = useState(!!token)
  const [error, setError] = useState<string | null>(null)

  // Verify token on mount and on token change
  useEffect(() => {
    if (!token) {
      setLoading(false)
      setUser(null)
      localStorage.removeItem('aita_user')
      return
    }

    setLoading(true)
    authService
      .getCurrentUser()
      .then((u) => {
        setUser(u)
        localStorage.setItem('aita_user', JSON.stringify(u))
        setError(null)
      })
      .catch((err) => {
        console.error('Token verification failed:', err)
        localStorage.removeItem('aita_token')
        localStorage.removeItem('aita_user')
        setToken(null)
        setUser(null)
        setError(err instanceof Error ? err.message : 'Session expired')
      })
      .finally(() => setLoading(false))
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    setLoading(true)
    try {
      const response = await authService.login({ email, password })
      const userRole = response.user.role as UserRole

      setToken(response.token)
      setUser(response.user)
      localStorage.setItem('aita_token', response.token)
      localStorage.setItem('aita_user', JSON.stringify(response.user))

      return userRole
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setToken(null)
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token && !!user,
      login,
      logout,
      error,
    }),
    [user, token, loading, login, logout, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
