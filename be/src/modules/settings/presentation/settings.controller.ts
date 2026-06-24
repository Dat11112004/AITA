import type { Request, Response } from 'express'
import { GetSystemConfigUseCase, UpdateSystemConfigUseCase, GetOptionsUseCase } from '../application/use-cases/settings.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'

export class SettingsController {
    constructor(
        private readonly getSystemConfigUseCase: GetSystemConfigUseCase,
        private readonly updateSystemConfigUseCase: UpdateSystemConfigUseCase,
        private readonly getOptionsUseCase: GetOptionsUseCase
    ) { }

    async getSystemConfig(_req: Request, res: Response): Promise<void> {
        const result = await this.getSystemConfigUseCase.execute()
        res.status(200).json(ApiResponse.success('Lấy cấu hình hệ thống thành công', result))
    }

    async updateSystemConfig(req: Request, res: Response): Promise<void> {
        const result = await this.updateSystemConfigUseCase.execute(req.body)
        res.status(200).json(ApiResponse.success('Cập nhật cấu hình hệ thống thành công', result))
    }

    async classOptions(req: Request, res: Response): Promise<void> {
        const user = (req as any).user
        const result = await this.getOptionsUseCase.getClassOptions(user)
        res.status(200).json(ApiResponse.success('Lấy danh sách lớp học thành công', result))
    }

    async lecturerOptions(_req: Request, res: Response): Promise<void> {
        const result = await this.getOptionsUseCase.getLecturerOptions()
        res.status(200).json(ApiResponse.success('Lấy danh sách giảng viên thành công', result))
    }

    async assignmentOptions(_req: Request, res: Response): Promise<void> {
        const result = await this.getOptionsUseCase.getAssignmentOptions()
        res.status(200).json(ApiResponse.success('Lấy danh sách bài tập thành công', result))
    }
}
