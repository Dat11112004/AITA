import { api, type SubmissionRow } from '@/lib/api'

/**
 * Submission service - handles assignment submission operations
 */
export const submissionService = {
  /**
   * Get submissions with optional filters
   */
  getSubmissions: async (params?: Record<string, string>): Promise<SubmissionRow[]> => {
    return api.getSubmissions(params)
  },

  /**
   * Get recent submissions
   */
  getRecentSubmissions: async (limit = 5): Promise<SubmissionRow[]> => {
    return api.getRecentSubmissions(limit),
  },

  /**
   * Get a specific submission
   */
  getSubmission: async (id: string): Promise<SubmissionRow> => {
    return api.getSubmission(id)
  },

  /**
   * Submit work for an assignment
   */
  submitWork: async (data: {
    assignmentId: string
    content?: string
    language?: string
    groupCode?: string
  }): Promise<SubmissionRow> => {
    return api.submitWork(data)
  },

  /**
   * Publish a submission with optional score
   */
  publishSubmission: async (id: string, score?: number): Promise<SubmissionRow> => {
    return api.publishSubmission(id, score)
  },
}
