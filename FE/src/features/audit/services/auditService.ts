/**
 * Audit Service - Audit logs and system tracking
 */

import { apiClient } from '@/lib/apiClient'

export interface AuditLog {
    id: string
    userId: string
    action: string
    entityName: string
    newValue?: any
    createdAt: string
}

class AuditService {
    async getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
        return apiClient.get<AuditLog[]>(`/audit/logs?limit=${limit}`)
    }

    async getActivityLogs(): Promise<any[]> {
        return apiClient.get('/stats/activity-logs')
    }
}

export const auditService = new AuditService()
