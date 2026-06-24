import type { Request, Response } from 'express'
import {
    GetOverviewUseCase,
    GetActivityLogsUseCase,
    GetLecturerReportUseCase,
    GetStudentProgressUseCase,
    GetStudentHistoryUseCase
} from '../application/use-cases/stats.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'

export class StatsController {
    constructor(
        private readonly getOverviewUseCase: GetOverviewUseCase,
        private readonly getActivityLogsUseCase: GetActivityLogsUseCase,
        private readonly getLecturerReportUseCase: GetLecturerReportUseCase,
        private readonly getStudentProgressUseCase: GetStudentProgressUseCase,
        private readonly getStudentHistoryUseCase: GetStudentHistoryUseCase
    ) { }

    async overview(req: Request, res: Response): Promise<void> {
        const user = (req as any).user
        const result = await this.getOverviewUseCase.execute(user)
        res.status(200).json(ApiResponse.success('Lấy tổng quan thành công', result))
    }

    async activityLogs(req: Request, res: Response): Promise<void> {
        const query = req.query as any
        const result = await this.getActivityLogsUseCase.execute({
            action: query.action,
            limit: Number(query.limit || 50)
        })
        res.status(200).json(ApiResponse.success('Lấy nhật ký hoạt động thành công', result))
    }

    async lecturerReport(req: Request, res: Response): Promise<void> {
        const lecturerId = (req as any).user.id
        const classId = req.query.classId as string | undefined
        const result = await this.getLecturerReportUseCase.execute(lecturerId, classId)
        res.status(200).json(ApiResponse.success('Lấy báo cáo giảng viên thành công', result))
    }

    async studentProgress(req: Request, res: Response): Promise<void> {
        const studentId = (req as any).user.id
        const result = await this.getStudentProgressUseCase.execute(studentId)
        res.status(200).json(ApiResponse.success('Lấy tiến độ sinh viên thành công', result))
    }

    async studentHistory(req: Request, res: Response): Promise<void> {
        const studentId = (req as any).user.id
        const result = await this.getStudentHistoryUseCase.execute(studentId)
        res.status(200).json(ApiResponse.success('Lấy lịch sử sinh viên thành công', result))
    }
}
