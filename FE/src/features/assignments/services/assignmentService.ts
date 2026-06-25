/**
 * Assignments Service
 */

import { apiClient } from '@/lib/apiClient'

export interface Assignment {
  id: string
  title: string
  description?: string
  classId: string
  status: string
  dueDate?: string
  totalPoints?: number
}

export interface CreateAssignmentRequest {
  title: string
  description?: string
  classId: string
  dueDate?: string
  totalPoints?: number
}

class AssignmentService {
  async getAssignments(classId?: string): Promise<Assignment[]> {
    const query = classId ? `?classId=${classId}` : ''
    return apiClient.get<Assignment[]>(`/assignments${query}`)
  }

  async getAssignment(id: string): Promise<Assignment> {
    return apiClient.get<Assignment>(`/assignments/${id}`)
  }

  async createAssignment(data: CreateAssignmentRequest): Promise<Assignment> {
    return apiClient.post<Assignment>('/assignments', data)
  }

  async updateAssignment(id: string, data: Partial<CreateAssignmentRequest>): Promise<Assignment> {
    return apiClient.patch<Assignment>(`/assignments/${id}`, data)
  }

  async deleteAssignment(id: string): Promise<void> {
    return apiClient.delete<void>(`/assignments/${id}`)
  }
}

export const assignmentService = new AssignmentService()
