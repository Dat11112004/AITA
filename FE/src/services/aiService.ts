import { api, type AIReviewRow, type AIConfig } from '@/lib/api'

/**
 * AI service - handles AI operations (generation, assessment, review)
 */
export const aiService = {
  /**
   * Generate an exercise using AI
   */
  generateExercise: async (data: unknown) => {
    return api.generateExercise(data)
  },

  /**
   * Save an AI-generated assignment
   */
  saveAIAssignment: async (data: unknown) => {
    return api.saveAIAssignment(data)
  },

  /**
   * Assess a submission using AI
   */
  assessSubmission: async (submissionId: string) => {
    return api.assessSubmission(submissionId)
  },

  /**
   * Get all AI reviews pending approval
   */
  getAIReviews: async (): Promise<AIReviewRow[]> => {
    return api.getAIReviews()
  },

  /**
   * Review an AI job (approve or reject)
   */
  reviewAIJob: async (jobId: string, approved: boolean, note?: string) => {
    return api.reviewAIJob(jobId, approved, note)
  },

  /**
   * Get AI configuration
   */
  getAIConfig: async (): Promise<AIConfig> => {
    return api.getAIConfig()
  },

  /**
   * Update AI configuration
   */
  updateAIConfig: async (config: Record<string, string>) => {
    return api.updateAIConfig(config)
  },
}
