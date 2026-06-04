import { api, type ClassRow, type CreateClassBody } from '@/lib/api'

/**
 * Class service - handles class management operations
 */
export const classService = {
  /**
   * Get all classes
   */
  getClasses: async (): Promise<ClassRow[]> => {
    return api.getClasses()
  },

  /**
   * Create a new class
   */
  createClass: async (data: CreateClassBody): Promise<ClassRow> => {
    return api.createClass(data)
  },

  /**
   * Get students in a specific class
   */
  getClassStudents: async (classId: string) => {
    return api.getClassStudents(classId)
  },
}
