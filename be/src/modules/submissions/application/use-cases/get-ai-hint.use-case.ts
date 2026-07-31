import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { prisma } from '../../../../database/prisma.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

export class GetAiHintUseCase implements IUseCase<{ submissionId: string; ruleScoreId: string; user: AuthUser }, { hint: string }> {
  async execute({ submissionId, ruleScoreId, user }: { submissionId: string; ruleScoreId: string; user: AuthUser }): Promise<{ hint: string }> {
    const submission = await prisma.submission.findUnique({
      where: { Id: submissionId },
      include: {
        Exam: true,
        SubmissionArtifact: true
      }
    })

    if (!submission) {
      throw new NotFoundError('Submission not found')
    }

    if (user.role === 'STUDENT' && submission.StudentId !== user.id) {
      throw new ForbiddenError('You can only request hints for your own submissions')
    }

    const ruleScore = await prisma.ruleScore.findUnique({
      where: { Id: ruleScoreId },
      include: {
        RubricRule: true,
        ExecutionResult: true
      }
    })

    if (!ruleScore) {
      throw new NotFoundError('Rule score not found')
    }

    // In a real application, we would extract the student's code from SubmissionArtifact or ExecutionResult
    // Here we'll simulate it with a generic context since we don't have the raw code easily available in this snippet
    const rubricDescription = ruleScore.RubricRule?.Description || 'Unknown Rule'
    const aiReasoning = ruleScore.AiReasoning || 'No specific reasoning provided'

    const systemPrompt = `You are a Senior Teaching Assistant (Senior Developer). 
The student made a mistake in the following criteria: "${rubricDescription}".
The evaluation reason is: "${aiReasoning}".

Your task:
1. Briefly explain what this issue means.
2. Provide constructive hints for the student to fix the issue themselves.
ABSOLUTELY DO NOT provide the complete solution code. Only provide guidance or general illustrative examples.
MUST BE WRITTEN ENTIRELY IN ENGLISH.`

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(systemPrompt)
      const response = await result.response
      const hint = response.text()
      
      return { hint }
    } catch (error) {
      console.error('Failed to generate AI hint:', error)
      return { hint: 'AI system is currently busy or unconfigured. Please try again later.' }
    }
  }
}
