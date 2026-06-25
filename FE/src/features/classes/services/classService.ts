/**
 * Classes Service - Manage academic classes
 */

import { apiClient } from '@/lib/apiClient'

export interface Class {
  id: string
  classCode: string
  className?: string
  subjectId: string
  subject?: string
  semesterId: string
  semester?: string
  status: string
  lecturerId?: string
  studentCount: number
}

export interface CreateClassRequest {
  classCode: string
  className?: string
  subjectId: string
  semesterId: string
  lecturerId?: string
}

class ClassService {
  async getClasses(): Promise<Class[]> {
    return apiClient.get<Class[]>('/classes')
  }

  async createClass(data: CreateClassRequest): Promise<Class> {
    return apiClient.post<Class>('/classes', data)
  }

  async updateClass(id: string, data: Partial<CreateClassRequest>): Promise<Class> {
    return apiClient.patch<Class>(`/classes/${id}`, data)
  }

  async getClassStudents(classId: string): Promise<any[]> {
    return apiClient.get(`/classes/${classId}/students`)
  }

  async enrollStudent(classId: string, studentId: string): Promise<any> {
    return apiClient.post(`/classes/${classId}/enroll`, { studentId })
  }
}

export const classService = new ClassService()
