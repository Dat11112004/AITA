import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { IAIService } from '../../../../shared/application/ports/ai-service.interface.js'
import { IAiRepository } from '../../domain/repositories/ai-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'

export class AssessSubmissionUseCase {
    constructor(
        private readonly uow: IUnitOfWork,
        private readonly aiService: IAIService,
        private readonly aiRepo: IAiRepository
    ) { }

    async execute(submissionId: string) {
        const sub = await this.uow.submissionRepository.findById(submissionId)
        if (!sub) throw new NotFoundError('Bài nộp không tồn tại')

        const result = await this.aiService.assess(
            '',
            undefined,
            (sub as any).Exam?.Title ?? undefined,
            (sub as any).Exam?.Description ?? undefined,
        )

        await this.aiRepo.logInteraction((sub as any).StudentId ?? '', 'assess', submissionId, JSON.stringify(result))

        return { submission: sub, aiScore: (result as any).aiScore, feedback: (result as any).feedback }
    }
}
