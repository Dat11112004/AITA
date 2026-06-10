import { api, type UserRow, type CreateUserBody } from '@/lib/api'

/**
 * User service - handles user management operations
 */
export const userService = {
  /**
   * Get all users, optionally filtered by role
   */
  getUsers: async (role = 'all'): Promise<UserRow[]> => {
    return api.getUsers(role)
  },

  /**
   * Create a new user
   */
  createUser: async (data: CreateUserBody): Promise<UserRow> => {
    return api.createUser(data)
  },
}
