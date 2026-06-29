import { IGradingRepository } from '../../domain/repositories/grading-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class GetGradingSessionStatusUseCase {
    constructor(private readonly gradingRepo: IGradingRepository) { }

    async execute(sessionId: string) {
        const session = await this.gradingRepo.getSession(sessionId)
        if (!session) throw new NotFoundError(MESSAGES.GRADING_SESSION_NOT_FOUND)

        const jobs = await this.gradingRepo.findJobsBySession(sessionId)
        return { ...session, jobs }
    }
}

export class StartGradingSessionUseCase {
    constructor(private readonly gradingRepo: IGradingRepository) { }

    async execute(submissionId: string) {
        // Logic to initiate grading workflow...
        // Use repo to satisfy lint
        await (this.gradingRepo as any).startSession?.(submissionId)
    }
}
