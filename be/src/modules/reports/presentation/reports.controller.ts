import type { Request, Response } from 'express'
import { GetAdminReportUseCase, GetSystemHealthUseCase } from '../application/use-cases/reports.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'

export class ReportsController {
    constructor(
        private readonly getAdminReportUseCase: GetAdminReportUseCase,
        private readonly getSystemHealthUseCase: GetSystemHealthUseCase
    ) { }

    async adminReport(req: Request, res: Response): Promise<void> {
        const period = String(req.query.period ?? '30d')
        const result = await this.getAdminReportUseCase.execute(period)
        res.status(200).json(ApiResponse.success('Lấy báo cáo quản trị thành công', result))
    }

    async systemHealth(_req: Request, res: Response): Promise<void> {
        const result = await this.getSystemHealthUseCase.execute()
        res.status(200).json(ApiResponse.success('Lấy trạng thái hệ thống thành công', result))
    }
}
