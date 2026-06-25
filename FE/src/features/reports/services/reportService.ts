/**
 * Reports Service
 */

import { apiClient } from '@/lib/apiClient'

export interface AdminReport {
  period: string
  totalUsers: number
  totalClasses: number
  totalAssignments: number
  totalSubmissions: number
}

export interface SystemHealth {
  database: string
  api: string
  cache: string
  status: string
}

class ReportService {
  async getAdminReport(period: string = 'month'): Promise<AdminReport> {
    return apiClient.get<AdminReport>(`/reports/admin?period=${period}`)
  }

  async getLecturerReport(classId?: string): Promise<any> {
    const query = classId ? `?classId=${classId}` : ''
    return apiClient.get(`/reports/lecturer${query}`)
  }

  async getStudentProgress(userId: string): Promise<any> {
    return apiClient.get(`/reports/student/${userId}/progress`)
  }

  async getStudentFeedback(userId: string): Promise<any> {
    return apiClient.get(`/reports/student/${userId}/feedback`)
  }

  async getStudentLearning(userId: string): Promise<any> {
    return apiClient.get(`/reports/student/${userId}/learning`)
  }

  async getActivity(): Promise<any> {
    return apiClient.get('/reports/activity')
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return apiClient.get<SystemHealth>('/reports/health')
  }
}

export const reportService = new ReportService()
