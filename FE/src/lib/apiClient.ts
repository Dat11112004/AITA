/**
 * Professional API Client with Error Handling
 * Handles authentication, token refresh, and standardized error responses
 */

export class ApiClientError extends Error {
    constructor(
        message: string,
        public status: number,
        public code?: string,
        public details?: Record<string, any>,
    ) {
        super(message)
        this.name = 'ApiClientError'
    }
}



const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const AUTH_STORAGE_KEY = 'aita_token'
const USER_STORAGE_KEY = 'aita_user'

class ApiClient {
    private baseURL = API_BASE_URL

    /**
     * Get stored authentication token
     */
    private getToken(): string | null {
        return localStorage.getItem(AUTH_STORAGE_KEY)
    }

    /**
     * Store authentication token
     */
    private setToken(token: string): void {
        localStorage.setItem(AUTH_STORAGE_KEY, token)
    }

    /**
     * Clear authentication token and user
     */
    private clearAuth(): void {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        localStorage.removeItem(USER_STORAGE_KEY)
    }

    /**
     * Build request headers with authentication
     */
    private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }

        const token = this.getToken()
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        return { ...headers, ...customHeaders }
    }

    /**
     * Make HTTP request
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`

        try {
            const response = await fetch(url, {
                ...options,
                headers: this.getHeaders(options.headers as Record<string, string>),
            })

            let json: any
            try {
                json = await response.json()
            } catch {
                json = { statusCode: response.status, Message: 'Invalid response format' }
            }

            // Log for debugging
            console.debug('[API]', endpoint, response.status, json)

            // Handle success response - backend format has Data field with capital D
            if (response.ok) {
                // Backend response format: {statusCode, Message, Data, timestamp}
                if (json.Data !== undefined) {
                    return json.Data as T
                }
                // Fallback: check for lowercase data
                if (json.data !== undefined) {
                    return json.data as T
                }
                // Fallback: if response has token/user directly
                if ((json.token && json.user) || json.token || json.user) {
                    return json as T
                }
                // Fallback: return whole response if not an error
                if (!json.Message?.includes('error') && !json.error) {
                    return json as T
                }
            }

            // Handle error response
            const errorMsg = json.Message || json.message || json.error?.message || response.statusText || 'Unknown error'
            const errorCode = json.statusCode || response.status

            throw new ApiClientError(
                errorMsg,
                errorCode,
                `HTTP_${response.status}`,
            )
        } catch (error) {
            if (error instanceof ApiClientError) {
                throw error
            }

            if (error instanceof TypeError) {
                throw new ApiClientError(
                    'Network error - unable to connect to server',
                    0,
                    'NETWORK_ERROR',
                )
            }

            throw new ApiClientError(
                error instanceof Error ? error.message : 'Unknown error',
                500,
                'UNKNOWN_ERROR',
            )
        }
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' })
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, body?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        })
    }

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, body?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        })
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' })
    }

    /**
     * Set token after login
     */
    setAuthToken(token: string): void {
        this.setToken(token)
    }

    /**
     * Clear auth on logout
     */
    clearAuthToken(): void {
        this.clearAuth()
    }
}

export const apiClient = new ApiClient()
