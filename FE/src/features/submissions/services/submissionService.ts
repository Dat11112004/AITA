/**
 * Submissions Service
 */

import { apiClient } from '@/lib/apiClient'

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  content?: string
  submittedAt?: string
  status: string
  score?: number
  aiFeedback?: any
}

export interface CreateSubmissionRequest {
  assignmentId: string
  content?: string
  language?: string
}

export interface GradeSubmissionRequest {
  score: number
  feedback?: string
}

class SubmissionService {
  async getSubmissions(assignmentId?: string): Promise<Submission[]> {
    const query = assignmentId ? `?assignmentId=${assignmentId}` : ''
    return apiClient.get<Submission[]>(`/submissions${query}`)
  }

  async getSubmission(id: string): Promise<Submission> {
    return apiClient.get<Submission>(`/submissions/${id}`)
  }

  async getRecentSubmissions(limit: number = 10): Promise<Submission[]> {
    return apiClient.get<Submission[]>(`/submissions?limit=${limit}`)
  }

  async createSubmission(data: CreateSubmissionRequest): Promise<Submission> {
    return apiClient.post<Submission>('/submissions', data)
  }

  async submitWork(data: any): Promise<Submission> {
    return apiClient.post<Submission>('/submissions', data)
  }

  async gradeSubmission(id: string, data: GradeSubmissionRequest): Promise<Submission> {
    return apiClient.patch<Submission>(`/submissions/${id}/publish`, data)
  }

  async publishSubmission(id: string, score: number): Promise<Submission> {
    return apiClient.patch<Submission>(`/submissions/${id}/publish`, { score })
  }

  async assessWithAI(id: string): Promise<any> {
    return apiClient.post(`/ai/assess/${id}`, {})
  }
}

export const submissionService = new SubmissionService()
