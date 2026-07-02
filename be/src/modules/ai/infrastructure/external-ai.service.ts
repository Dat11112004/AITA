import { env } from '../../../config/env.js'
import type {
    IAIService,
    GenerateExerciseInput,
    GenerateExerciseOutput,
    AssessInput,
    AssessOutput,
    LearningFeedbackOutput,
    GenerateRubricInput,
    GenerateRubricOutput
} from '../../../shared/application/ports/ai-service.interface.js'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class ExternalAiService implements IAIService {
    async generateExercise(input: GenerateExerciseInput): Promise<GenerateExerciseOutput> {
        if (env.AI_STUB_MODE) {
            await wait(800)
            const type = input.type ?? 'coding'
            const topic = input.topic ?? 'Topic'
            return {
                title: `[AI] Bài tập ${type}: ${topic}`,
                description: `Độ khó ${input.difficulty ?? 'medium'}`,
                content: { type, topic, stub: true },
            }
        }

        const response = await fetch(`${env.AI_ENDPOINT}/generate-exercise`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            throw new Error(`AI Microservice error: ${errorText}`)
        }

        return response.json()
    }

    async assess(input: AssessInput): Promise<AssessOutput> {
        if (env.AI_STUB_MODE) {
            await wait(1000)
            const aiScore = Math.round((7 + Math.random() * 2) * 10) / 10
            return {
                aiScore,
                feedback: {
                    testCases: { passed: 4, total: 5 },
                    codingStyle: 'Đặt tên biến rõ ràng.',
                    logic: 'Logic đúng happy path.',
                    performance: 'Ổn.',
                    suggestions: ['Thêm unit test'],
                    language: input.language,
                    length: input.content.length,
                },
            }
        }

        const response = await fetch(`${env.AI_ENDPOINT}/assess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            throw new Error(`AI Microservice error: ${errorText}`)
        }

        return response.json()
    }

    async learningFeedback(studentId: string): Promise<LearningFeedbackOutput> {
        if (env.AI_STUB_MODE) {
            await wait(500)
            return {
                studentId,
                weakTopics: ['Unit Testing', 'Design Patterns'],
                recommendations: [
                    { type: 'reading', title: 'JUnit Best Practices' },
                    { type: 'practice', title: 'REST API Lab' },
                ],
            }
        }

        const response = await fetch(`${env.AI_ENDPOINT}/learning-feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId }),
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            throw new Error(`AI Microservice error: ${errorText}`)
        }

        return response.json()
    }

    async generateRubric(input: GenerateRubricInput): Promise<GenerateRubricOutput> {
        if (env.AI_STUB_MODE) {
            await wait(1000)
            const total = input.totalScore || 10
            return {
                criteria: [
                    { name: 'Tính đúng đắn (Logic)', description: 'Chương trình chạy đúng yêu cầu cơ bản.', maxScore: total * 0.4 },
                    { name: 'Chất lượng mã (Code Quality)', description: 'Mã nguồn dễ đọc, chuẩn naming convention.', maxScore: total * 0.3 },
                    { name: 'Hiệu suất (Performance)', description: 'Sử dụng thuật toán và cấu trúc dữ liệu tối ưu.', maxScore: total * 0.3 }
                ],
                totalScore: total
            }
        }

        const response = await fetch(`${env.AI_ENDPOINT}/generate-rubric`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            throw new Error(`AI Microservice error: ${errorText}`)
        }

        return response.json()
    }
}
