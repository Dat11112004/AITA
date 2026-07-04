import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { ListSubmissionsUseCase } from '../application/use-cases/list-submissions.use-case.js'
import { CreateSubmissionUseCase } from '../application/use-cases/create-submission.use-case.js'
import { GetSubmissionUseCase } from '../application/use-cases/get-submission.use-case.js'
import { PublishGradeUseCase } from '../application/use-cases/publish-grade.use-case.js'
import { RecentSubmissionsUseCase } from '../application/use-cases/recent-submissions.use-case.js'
import { SubmitFeedbackUseCase } from '../application/use-cases/submit-feedback.use-case.js'
import { BulkPublishGradesUseCase } from '../application/use-cases/bulk-publish-grades.use-case.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class SubmissionsController extends BaseController {
    constructor(
        private readonly listUseCase: ListSubmissionsUseCase,
        private readonly recentUseCase: RecentSubmissionsUseCase,
        private readonly getOneUseCase: GetSubmissionUseCase,
        private readonly submitUseCase: CreateSubmissionUseCase,
        private readonly publishGradeUseCase: PublishGradeUseCase,
        private readonly submitFeedbackUseCase: SubmitFeedbackUseCase,
        private readonly bulkPublishGradesUseCase: BulkPublishGradesUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async list(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received request to list submissions')
        const params = {
            assignmentId: req.query.assignmentId as string,
            status: req.query.status as string,
        }
        const result = await this.listUseCase.execute({ user: req.user!, query: { data: params } as any })
        this.ok(res, result, MESSAGES.SUBMISSION_LIST_SUCCESS)
    }

    async recent(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received request to get recent submissions')
        const limit = Math.min(Number(req.query.limit) || 5, 20)
        const result = await this.recentUseCase.execute({ user: req.user!, limit })
        this.ok(res, result, MESSAGES.SUBMISSION_RECENT_SUCCESS)
    }

    async getOne(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received request to get submission: ${req.params.id}`)
        const result = await this.getOneUseCase.execute({ id: String(req.params.id), user: req.user! })
        this.ok(res, result, MESSAGES.SUBMISSION_GET_SUCCESS)
    }

    async submit(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received request to create submission')
        const result = await this.submitUseCase.execute({ dto: { data: req.body } as any, user: req.user! })
        this.created(res, result, MESSAGES.SUBMISSION_CREATE_SUCCESS)
    }

    async publishGrade(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received request to publish grade for submission: ${req.params.id}`)
        const result = await this.publishGradeUseCase.execute({ id: String(req.params.id), dto: { data: req.body } as any, user: req.user! })
        this.ok(res, result, MESSAGES.SUBMISSION_PUBLISH_SUCCESS)
    }

    async bulkPublish(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received request to bulk publish grades for assignment: ${req.body.assignmentId}`)
        // @ts-ignore - Will inject this use case later
        const result = await this.bulkPublishGradesUseCase.execute({ assignmentId: String(req.body.assignmentId), user: req.user! })
        this.ok(res, result, 'Đã công bố điểm cho tất cả sinh viên thành công')
    }

    async submitFeedback(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received request to submit feedback for submission: ${req.params.id}`)
        const result = await this.submitFeedbackUseCase.execute({ id: String(req.params.id), user: req.user!, feedback: req.body.feedback })
        this.ok(res, result, 'Gửi ý kiến thành công')
    }
}
