import { env } from '../config/env.js'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const aiService = {
  async generateExercise(input: Record<string, unknown>) {
    if (env.AI_STUB_MODE) {
      console.log('💡 Running AI Service in STUB mode (Generate Exercise)')
      await wait(800)
      const type = String(input.type ?? 'coding')
      const topic = String(input.topic ?? 'Topic')
      return {
        title: `[AI] Bài tập ${type}: ${topic}`,
        description: `Độ khó ${input.difficulty ?? 'medium'}`,
        content: { type, topic, stub: true },
      }
    }

    console.log('🚀 Calling Python AI Service -> /generate-exercise')
    const response = await fetch(`${env.AI_ENDPOINT}/generate-exercise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId: input.classId,
        type: input.type,
        topic: input.topic,
        difficulty: input.difficulty ?? 'medium',
        questionCount: input.questionCount ?? 5,
        language: input.language ?? 'javascript',
        extra: input.extra,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`AI Microservice error: ${errorText}`)
    }

    return response.json()
  },

  async assess(content: string, language?: string, assignmentTitle?: string, assignmentDescription?: string) {
    if (env.AI_STUB_MODE) {
      console.log('💡 Running AI Service in STUB mode (Assess Submission)')
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
          language,
          length: content.length,
        },
      }
    }

    console.log('🚀 Calling Python AI Service -> /assess')
    const response = await fetch(`${env.AI_ENDPOINT}/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        language,
        assignmentTitle,
        assignmentDescription,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`AI Microservice error: ${errorText}`)
    }

    return response.json()
  },

  async learningFeedback(studentId: string) {
    if (env.AI_STUB_MODE) {
      console.log('💡 Running AI Service in STUB mode (Learning Feedback)')
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

    console.log('🚀 Calling Python AI Service -> /learning-feedback')
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
  },

  schedule(_jobId: string) {
    console.log('⚠️ AI job scheduling not available - no AIJob model in schema')
  },
}
