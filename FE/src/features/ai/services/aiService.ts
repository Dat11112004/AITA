/**
 * AI Service - AI-powered features (exercise generation, assessment, etc.)
 */

import { apiClient } from '@/lib/apiClient'

export interface GenerateExerciseRequest {
  topic: string
  difficulty: string
  quantity: number
}

export interface AssessSubmissionRequest {
  submissionId: string
}

class AIService {
  async getAIReviews(): Promise<any[]> {
    return apiClient.get('/ai/reviews')
  }

  async generateExercise(data: any): Promise<any> {
    return apiClient.post('/ai/generate-exercise', data)
  }

  async saveAIAssignment(data: any): Promise<any> {
    return apiClient.post('/ai/save-assignment', data)
  }

  async assessSubmission(submissionId: string): Promise<any> {
    return apiClient.post(`/ai/assess/${submissionId}`, {})
  }

  async reviewAIJob(jobId: string, approved: boolean, note?: string): Promise<any> {
    return apiClient.post(`/ai/reviews/${jobId}`, { approved, note })
  }

  async getAIConfig(): Promise<any> {
    return apiClient.get('/ai/config')
  }

  async updateAIConfig(config: Record<string, any>): Promise<any> {
    return apiClient.patch('/ai/config', config)
  }

  async getLearningFeedback(userId: string): Promise<any> {
    return apiClient.get(`/ai/feedback/${userId}`)
  }
}

export const aiService = new AIService()
