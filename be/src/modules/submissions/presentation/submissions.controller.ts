import type { Request, Response } from 'express'
import { ListSubmissionsUseCase } from '../application/use-cases/list-submissions.use-case.js'
import { CreateSubmissionUseCase } from '../application/use-cases/create-submission.use-case.js'
import { GetSubmissionUseCase } from '../application/use-cases/get-submission.use-case.js'
import { PublishGradeUseCase } from '../application/use-cases/publish-grade.use-case.js'
import { RecentSubmissionsUseCase } from '../application/use-cases/recent-submissions.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'


export class SubmissionsController {
    constructor(
        private readonly listUseCase: ListSubmissionsUseCase,
        private readonly recentUseCase: RecentSubmissionsUseCase,
        private readonly getOneUseCase: GetSubmissionUseCase,
        private readonly submitUseCase: CreateSubmissionUseCase,
        private readonly publishGradeUseCase: PublishGradeUseCase
    ) { }

    async list(req: Request, res: Response): Promise<void> {
        const params = {
            assignmentId: req.query.assignmentId as string,
            status: req.query.status as string,
        }
        const result = await this.listUseCase.execute({ user: req.user!, query: { data: params } as any })
        res.status(200).json(new ApiResponse(200, 'Lấy danh sách bài nộp thành công', result))
    }

    async recent(req: Request, res: Response): Promise<void> {
        const limit = Math.min(Number(req.query.limit) || 5, 20)
        const result = await this.recentUseCase.execute({ user: req.user!, limit })
        res.status(200).json(new ApiResponse(200, 'Lấy bài nộp gần đây thành công', result))
    }

    async getOne(req: Request, res: Response): Promise<void> {
        const result = await this.getOneUseCase.execute({ id: String(req.params.id), user: req.user! })
        if (!result) {
            res.status(404).json(new ApiResponse(404, 'Không tìm thấy bài nộp'))
            return
        }
        res.status(200).json(new ApiResponse(200, 'Lấy chi tiết bài nộp thành công', result))
    }

    async submit(req: Request, res: Response): Promise<void> {
        const result = await this.submitUseCase.execute({ dto: req.body, user: req.user! })
        res.status(201).json(new ApiResponse(201, 'Nộp bài thành công', result))
    }

    async publishGrade(req: Request, res: Response): Promise<void> {
        const result = await this.publishGradeUseCase.execute({ id: String(req.params.id), dto: req.body })
        res.status(200).json(new ApiResponse(200, 'Công bố điểm thành công', result))
    }
}
