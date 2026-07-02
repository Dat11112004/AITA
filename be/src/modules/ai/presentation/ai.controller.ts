import type { Request, Response } from 'express'
import { z } from 'zod'
import { GenerateExerciseUseCase } from '../application/use-cases/generate-exercise.use-case.js'
import { SaveAiAssignmentUseCase } from '../application/use-cases/save-ai-assignment.use-case.js'
import { AssessSubmissionUseCase } from '../application/use-cases/assess-submission.use-case.js'
import { GetLearningFeedbackUseCase } from '../application/use-cases/get-learning-feedback.use-case.js'
import { GetAiConfigUseCase, UpdateAiConfigUseCase } from '../application/use-cases/ai-config.use-case.js'
import { GenerateRubricUseCase } from '../application/use-cases/generate-rubric.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'
import { ForbiddenError } from '../../../shared/application/app.error.js'
import { MESSAGES } from '../../../shared/constants/messages.js'

export class AiController {
    constructor(
        private readonly generateExerciseUseCase: GenerateExerciseUseCase,
        private readonly saveAssignmentUseCase: SaveAiAssignmentUseCase,
        private readonly assessSubmissionUseCase: AssessSubmissionUseCase,
        private readonly getLearningFeedbackUseCase: GetLearningFeedbackUseCase,
        private readonly getConfigUseCase: GetAiConfigUseCase,
        private readonly updateConfigUseCase: UpdateAiConfigUseCase,
        private readonly generateRubricUseCase: GenerateRubricUseCase
    ) { }

    async generateExercise(req: Request, res: Response): Promise<void> {
        const input = z.object({
            classId: z.string().optional(),
            type: z.enum(['quiz', 'coding', 'group']),
            topic: z.string().min(1),
            difficulty: z.string().optional(),
            questionCount: z.coerce.number().optional(),
            language: z.string().optional(),
            extra: z.string().optional(),
        }).parse(req.body)

        const result = await this.generateExerciseUseCase.execute(input)
        res.status(200).json(ApiResponse.success(MESSAGES.AI_GENERATE_SUCCESS, { result, assignment: null }))
    }

    async generateRubric(req: Request, res: Response): Promise<void> {
        const input = z.object({
            topic: z.string().min(1),
            difficulty: z.string().optional(),
            totalScore: z.coerce.number().optional(),
        }).parse(req.body)

        const result = await this.generateRubricUseCase.execute(input)
        res.status(200).json(ApiResponse.success('Generated rubric successfully', result))
    }

    async saveAssignmentFromAI(req: Request, res: Response): Promise<void> {
        const body = z.object({
            classId: z.string(),
            title: z.string().min(2),
            description: z.string().optional(),
            type: z.enum(['quiz', 'coding', 'group']),
            content: z.unknown().optional(),
            publish: z.boolean().optional(),
        }).parse(req.body)

        const result = await this.saveAssignmentUseCase.execute({ dto: body, creatorId: req.user!.id })
        res.status(201).json(ApiResponse.success(MESSAGES.AI_SAVE_SUCCESS, result, 201))
    }

    async assessSubmission(req: Request, res: Response): Promise<void> {
        const submissionId = String(req.params.submissionId)
        const result = await this.assessSubmissionUseCase.execute(submissionId)
        res.status(200).json(ApiResponse.success(MESSAGES.AI_ASSESS_SUCCESS, result))
    }

    async learningFeedback(req: Request, res: Response): Promise<void> {
        const studentId = String(req.params.studentId)
        if (req.user!.role === 'STUDENT' && req.user!.id !== studentId) throw new ForbiddenError(MESSAGES.FORBIDDEN)
        const result = await this.getLearningFeedbackUseCase.execute(studentId)
        res.status(200).json(ApiResponse.success(MESSAGES.AI_FEEDBACK_SUCCESS, result))
    }

    async getConfig(_req: Request, res: Response): Promise<void> {
        const result = await this.getConfigUseCase.execute()
        res.status(200).json(ApiResponse.success(MESSAGES.AI_CONFIG_GET_SUCCESS, result))
    }

    async updateConfig(req: Request, res: Response): Promise<void> {
        const result = await this.updateConfigUseCase.execute(req.body)
        res.status(200).json(ApiResponse.success(MESSAGES.AI_CONFIG_UPDATE_SUCCESS, result))
    }
}
