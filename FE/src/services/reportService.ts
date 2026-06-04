import { api } from '@/lib/api'

/**
 * Report service - handles reporting and analytics operations
 */
export const reportService = {
  /**
   * Get admin dashboard report for a specific period
   */
  getAdminReport: async (period: string) => {
    return api.getAdminReport(period)
  },

  /**
   * Get lecturer report, optionally filtered by class
   */
  getLecturerReport: async (classId?: string) => {
    return api.getLecturerReport(classId)
  },

  /**
   * Get student progress data
   */
  getStudentProgress: async () => {
    return api.getStudentProgress()
  },

  /**
   * Get student feedback data
   */
  getStudentFeedback: async () => {
    return api.getStudentFeedback()
  },

  /**
   * Get student learning insights
   */
  getStudentLearning: async () => {
    return api.getStudentLearning()
  },

  /**
   * Get system health status
   */
  getSystemHealth: async () => {
    return api.getSystemHealth()
  },

  /**
   * Get activity logs
   */
  getActivity: async () => {
    return api.getActivity()
  },
}
