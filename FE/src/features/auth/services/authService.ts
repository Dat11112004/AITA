/**
 * Authentication Service
 * Handles login, register, and user profile operations with the backend
 */

import { apiClient, ApiClientError } from '@/lib/apiClient'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    email: string
    fullName: string
    role: 'admin' | 'lecturer' | 'student'
    status: string
  }
}

export interface CurrentUser {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'lecturer' | 'student'
  status: string
}

class AuthService {
  /**
   * Login with email and password
   * @throws ApiClientError if credentials are invalid
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required')
    }

    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials)

      // Store token for subsequent requests
      if (response.token) {
        apiClient.setAuthToken(response.token)
      }

      return response
    } catch (error) {
      if (error instanceof ApiClientError) {
        // Provide user-friendly error messages
        if (error.status === 401) {
          throw new Error('Email hoặc mật khẩu không đúng')
        }
        throw error
      }
      throw error
    }
  }

  /**
   * Register new student account
   * @throws ApiClientError if registration fails
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    if (!data.email || !data.password || !data.fullName) {
      throw new Error('Email, password, and full name are required')
    }

    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data)

      if (response.token) {
        apiClient.setAuthToken(response.token)
      }

      return response
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error
      }
      throw error
    }
  }

  /**
   * Get current authenticated user
   * @throws ApiClientError if token is invalid or user not found
   */
  async getCurrentUser(): Promise<CurrentUser> {
    try {
      return await apiClient.get<CurrentUser>('/auth/me')
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        // Token is invalid, clear it
        apiClient.clearAuthToken()
        throw new Error('Session expired. Please login again.')
      }
      throw error
    }
  }

  /**
   * Logout - clear auth token
   */
  logout(): void {
    apiClient.clearAuthToken()
    localStorage.removeItem('aita_user')
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('aita_token')
  }
}

export const authService = new AuthService()
