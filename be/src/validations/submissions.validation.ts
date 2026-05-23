import { z } from 'zod'

export const submitAssignmentSchema = z.object({
  assignmentId: z.string(),
  content: z.string().optional(),
  language: z.string().optional(),
  groupCode: z.string().optional(),
})

export const publishGradeSchema = z.object({
  score: z.coerce.number().optional()
})
