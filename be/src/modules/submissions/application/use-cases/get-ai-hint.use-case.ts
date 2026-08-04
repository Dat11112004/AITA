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

    const systemPrompt = `Bạn là một trợ lý giảng dạy (Senior Developer). 
Sinh viên đã làm sai bài tập ở tiêu chí: "${rubricDescription}".
Lý do AI chấm điểm trừ là: "${aiReasoning}".

Nhiệm vụ của bạn:
1. Giải thích ngắn gọn lỗi này nghĩa là gì.
2. Đưa ra gợi ý (hints) để sinh viên tự sửa lỗi.
TUYỆT ĐỐI KHÔNG cung cấp toàn bộ code giải hoàn chỉnh. Chỉ đưa ra hướng dẫn tư duy hoặc ví dụ minh họa chung chung.`

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(systemPrompt)
      const response = await result.response
      const hint = response.text()
      
      return { hint }
    } catch (error) {
      console.error('Failed to generate AI hint:', error)
      return { hint: 'Hệ thống AI hiện đang bận hoặc chưa được cấu hình. Vui lòng thử lại sau.' }
    }
  }
}
