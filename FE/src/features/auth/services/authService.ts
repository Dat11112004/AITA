import { api, type AuthUser } from '@/lib/api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  fullName: string
  externalId?: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

/**
 * Authentication service - handles login, registration, and user profile operations
 */
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return api.login(credentials.email, credentials.password)
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    return api.register(data)
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    return api.me()
  },

  logout: async (): Promise<void> => {
    // Clear token and user from storage
    localStorage.removeItem('aita_token')
    localStorage.removeItem('aita_user')
  },
}
