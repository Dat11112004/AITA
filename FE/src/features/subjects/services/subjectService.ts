/**
 * Subjects Service - Academic subject management
 */

import { apiClient } from '@/lib/apiClient'

export interface Subject {
    id: string
    subjectCode: string
    subjectName: string
    difficulty?: string
    description: string
    isActive: boolean
}

export interface CreateSubjectRequest {
    subjectCode: string
    subjectName: string
    difficulty?: string
    description: string
}

class SubjectService {
    async getSubjects(): Promise<Subject[]> {
        return apiClient.get<Subject[]>('/subjects')
    }

    async createSubject(data: CreateSubjectRequest): Promise<Subject> {
        return apiClient.post<Subject>('/subjects', data)
    }

    async updateSubject(id: string, data: Partial<CreateSubjectRequest>): Promise<Subject> {
        return apiClient.patch<Subject>(`/subjects/${id}`, data)
    }

    async deleteSubject(id: string): Promise<void> {
        return apiClient.delete<void>(`/subjects/${id}`)
    }
}

export const subjectService = new SubjectService()
