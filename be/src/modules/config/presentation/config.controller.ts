import type { Request, Response } from 'express'
import { ListProjectTypesUseCase, GetProjectTypeUseCase, UpdateProjectTypeUseCase } from '../application/use-cases/config.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'

export class ConfigController {
    constructor(
        private readonly listProjectTypesUseCase: ListProjectTypesUseCase,
        private readonly getProjectTypeUseCase: GetProjectTypeUseCase,
        private readonly updateProjectTypeUseCase: UpdateProjectTypeUseCase
    ) { }

    async listProjectTypes(_req: Request, res: Response): Promise<void> {
        const result = await this.listProjectTypesUseCase.execute()
        res.status(200).json(ApiResponse.success('Lấy danh sách loại dự án thành công', result))
    }

    async getProjectType(req: Request, res: Response): Promise<void> {
        const code = String(req.params.code)
        const result = await this.getProjectTypeUseCase.execute(code)
        res.status(200).json(ApiResponse.success('Lấy thông tin loại dự án thành công', result))
    }

    async updateProjectType(req: Request, res: Response): Promise<void> {
        const code = String(req.params.code)
        const result = await this.updateProjectTypeUseCase.execute(code, req.body)
        res.status(200).json(ApiResponse.success('Cập nhật loại dự án thành công', result))
    }
}
