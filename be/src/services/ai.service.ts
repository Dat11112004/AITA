import { AIJobStatus, AIJobType } from '@prisma/client'
import { env } from '../config/env.js'
import { prisma } from '../database/prisma.js'

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

    // Call real Python AI Microservice
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

    // Call real Python AI Microservice
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

    // Call real Python AI Microservice
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

  async runJob(jobId: string) {
    const job = await prisma.aIJob.findUnique({
      where: { id: jobId },
      include: { submission: { include: { assignment: true } } },
    })
    if (!job) return

    await prisma.aIJob.update({ where: { id: jobId }, data: { status: AIJobStatus.PROCESSING } })
    try {
      const input = job.input ? JSON.parse(job.input) : {}
      let output: object
      if (job.type === AIJobType.EXERCISE_GENERATION) {
        output = await this.generateExercise(input)
      } else if (job.type === AIJobType.ASSESSMENT && job.submission) {
        output = await this.assess(
          job.submission.content ?? '',
          job.submission.language ?? undefined,
          job.submission.assignment.title,
          job.submission.assignment.description ?? undefined,
        )
      } else if (job.type === AIJobType.LEARNING_FEEDBACK) {
        output = await this.learningFeedback(String(input.studentId ?? job.createdById))
        const parsed = output as { skills?: { topic: string; level: string; suggestion?: string }[] }
        if (parsed.skills && Array.isArray(parsed.skills)) {
          const studentId = String(input.studentId ?? job.createdById)
          // Delete old insights
          await prisma.learningInsight.deleteMany({ where: { studentId } })
          // Insert new ones
          await prisma.learningInsight.createMany({
            data: parsed.skills.map((s) => ({
              studentId,
              topic: s.topic,
              level: s.level,
              suggestion: s.suggestion,
            })),
          })
        }
      } else {
        output = {}
      }
      await prisma.aIJob.update({
        where: { id: jobId },
        data: { status: AIJobStatus.COMPLETED, output: JSON.stringify(output) },
      })
      
      // Auto queue learning feedback after assessment
      if (job.type === AIJobType.ASSESSMENT && job.createdById) {
        const fbJob = await prisma.aIJob.create({
          data: {
            type: AIJobType.LEARNING_FEEDBACK,
            status: 'PENDING',
            createdById: job.createdById,
          },
        })
        this.schedule(fbJob.id)
      }
    } catch (e) {
      await prisma.aIJob.update({
        where: { id: jobId },
        data: {
          status: AIJobStatus.FAILED,
          errorMessage: e instanceof Error ? e.message : 'Failed',
        },
      })
    }
  },

  schedule(jobId: string) {
    setImmediate(() => void this.runJob(jobId))
  },
}
