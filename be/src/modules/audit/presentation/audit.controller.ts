import type { Request, Response } from 'express'
import { GetAuditLogsUseCase } from '../application/use-cases/get-audit-logs.use-case.js'
import { GetAiUsageLogsUseCase } from '../application/use-cases/get-ai-usage-logs.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'

export class AuditController {
    constructor(
        private readonly getAuditLogsUseCase: GetAuditLogsUseCase,
        private readonly getAiUsageLogsUseCase: GetAiUsageLogsUseCase
    ) { }

    async getAuditLogs(req: Request, res: Response): Promise<void> {
        const query = req.query as any
        const result = await this.getAuditLogsUseCase.execute({
            entityName: query.entityName,
            entityId: query.entityId,
            userId: query.userId,
            page: Number(query.page || 1),
            limit: Number(query.limit || 20)
        })
        res.status(200).json(ApiResponse.success('Lấy danh sách nhật ký kiểm tra thành công', result))
    }

    async getAiUsageLogs(req: Request, res: Response): Promise<void> {
        const query = req.query as any
        const result = await this.getAiUsageLogsUseCase.execute({
            userId: query.userId,
            model: query.model,
            page: Number(query.page || 1),
            limit: Number(query.limit || 20)
        })
        res.status(200).json(ApiResponse.success('Lấy danh sách nhật ký sử dụng AI thành công', result))
    }
}
