import type { Request, Response } from 'express'
import { ListAssignmentsUseCase } from '../application/use-cases/list-assignments.use-case.js'
import { CreateAssignmentUseCase } from '../application/use-cases/create-assignment.use-case.js'
import { UpdateAssignmentUseCase } from '../application/use-cases/update-assignment.use-case.js'
import { GetAssignmentUseCase } from '../application/use-cases/get-assignment.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'
import { Logger } from '../../../shared/infrastructure/logger.js'

export class AssignmentsController {
    private readonly logger = new Logger('AssignmentsController')

    constructor(
        private readonly listUseCase: ListAssignmentsUseCase,
        private readonly createUseCase: CreateAssignmentUseCase,
        private readonly updateUseCase: UpdateAssignmentUseCase,
        private readonly getOneUseCase: GetAssignmentUseCase,
    ) { }

    async list(req: Request, res: Response): Promise<void> {
        this.logger.info('Listing assignments')
        const params = {
            classId: req.query.classId as string,
            status: req.query.status as string,
            type: req.query.type as string,
        }
        const result = await this.listUseCase.execute(req.user, params)
        res.status(200).json(ApiResponse.success('Lấy danh sách bài tập thành công', result))
    }

    async create(req: Request, res: Response): Promise<void> {
        this.logger.info('Creating assignment')
        const result = await this.createUseCase.execute(req.body)
        res.status(201).json(ApiResponse.created('Tạo bài tập thành công', result))
    }

    async update(req: Request, res: Response): Promise<void> {
        this.logger.info(`Updating assignment: ${req.params.id}`)
        const result = await this.updateUseCase.execute(String(req.params.id), req.body)
        res.status(200).json(ApiResponse.success('Cập nhật bài tập thành công', result))
    }

    async getOne(req: Request, res: Response): Promise<void> {
        this.logger.info(`Getting assignment: ${req.params.id}`)
        const result = await this.getOneUseCase.execute(String(req.params.id))
        if (!result) {
            res.status(404).json(ApiResponse.notFound('Không tìm thấy bài tập'))
            return
        }
        res.status(200).json(ApiResponse.success('Lấy chi tiết bài tập thành công', result))
    }
}
