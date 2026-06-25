/**
 * Users Service - Admin user management
 */

import { apiClient } from '@/lib/apiClient'

export interface User {
  id: string
  email: string
  fullName: string
  role: string
  status: string
}

export interface CreateUserRequest {
  email: string
  password: string
  fullName: string
  role: string
}

class UserService {
  async getUsers(role?: string): Promise<User[]> {
    const query = role ? `?role=${role}` : ''
    return apiClient.get<User[]>(`/users${query}`)
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    return apiClient.post<User>('/users', data)
  }

  async updateUser(id: string, data: Partial<CreateUserRequest>): Promise<User> {
    return apiClient.patch<User>(`/users/${id}`, data)
  }

  async deleteUser(id: string): Promise<void> {
    return apiClient.delete<void>(`/users/${id}`)
  }

  async toggleUserLock(id: string, locked: boolean): Promise<User> {
    return apiClient.patch<User>(`/users/${id}/lock`, { locked })
  }
}

export const userService = new UserService()
