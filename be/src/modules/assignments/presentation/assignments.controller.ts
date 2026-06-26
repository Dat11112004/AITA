import type { Request, Response } from 'express'
import { ListAssignmentsUseCase } from '../application/use-cases/list-assignments.use-case.js'
import { CreateAssignmentUseCase } from '../application/use-cases/create-assignment.use-case.js'
import { UpdateAssignmentUseCase } from '../application/use-cases/update-assignment.use-case.js'
import { GetAssignmentUseCase } from '../application/use-cases/get-assignment.use-case.js'
import { CreateAssignmentDto, UpdateAssignmentDto } from '../application/dtos/assignment.dto.js'
import { ok } from '../../../utils/response.js'
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
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10
        }
        const result = await this.listUseCase.execute({ user: req.user!, params })
        ok(res, result, 200, 'Lấy danh sách bài tập thành công')
    }

    async create(req: Request, res: Response): Promise<void> {
        this.logger.info('Creating assignment')
        const dto = CreateAssignmentDto.from(req.body)
        const result = await this.createUseCase.execute({ dto, user: req.user! })
        ok(res, result, 201, 'Tạo bài tập thành công')
    }

    async update(req: Request, res: Response): Promise<void> {
        this.logger.info(`Updating assignment: ${req.params.id}`)
        const dto = UpdateAssignmentDto.from(req.body)
        const result = await this.updateUseCase.execute(String(req.params.id), dto)
        ok(res, result, 200, 'Cập nhật bài tập thành công')
    }

    async getOne(req: Request, res: Response): Promise<void> {
        this.logger.info(`Getting assignment: ${req.params.id}`)
        const result = await this.getOneUseCase.execute(String(req.params.id))
        if (!result) {
            ok(res, null, 404, 'Không tìm thấy bài tập')
            return
        }
        ok(res, result, 200, 'Lấy chi tiết bài tập thành công')
    }
}
