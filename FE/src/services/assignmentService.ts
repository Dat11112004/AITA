import { api, type AssignmentRow } from '@/lib/api'

/**
 * Assignment service - handles assignment management operations
 */
export const assignmentService = {
  /**
   * Get assignments with optional filters
   */
  getAssignments: async (params?: Record<string, string>): Promise<AssignmentRow[]> => {
    return api.getAssignments(params)
  },

  /**
   * Create a new assignment
   */
  createAssignment: async (data: unknown): Promise<AssignmentRow> => {
    return api.createAssignment(data)
  },

  /**
   * Update an assignment
   */
  updateAssignment: async (id: string, data: unknown): Promise<AssignmentRow> => {
    return api.updateAssignment(id, data)
  },
}
