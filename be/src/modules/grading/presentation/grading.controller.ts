import type { Request, Response } from 'express'
import { GetGradingSessionStatusUseCase, StartGradingSessionUseCase } from '../application/use-cases/grading.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'

export class GradingController {
    constructor(
        private readonly getGradingSessionStatusUseCase: GetGradingSessionStatusUseCase,
        private readonly startGradingSessionUseCase: StartGradingSessionUseCase
    ) { }

    async getSessionStatus(req: Request, res: Response): Promise<void> {
        const sessionId = req.params.sessionId as string
        const result = await this.getGradingSessionStatusUseCase.execute(sessionId)
        res.status(200).json(ApiResponse.success('Lấy trạng thái phiên chấm điểm thành công', result))
    }

    async startGrading(req: Request, res: Response): Promise<void> {
        const { submissionId } = req.body
        const result = await this.startGradingSessionUseCase.execute(submissionId)
        res.status(202).json(ApiResponse.success('Đã bắt đầu phiên chấm điểm', result))
    }
}
