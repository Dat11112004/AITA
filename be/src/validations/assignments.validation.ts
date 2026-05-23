import { z } from 'zod'

export const createAssignmentSchema = z.object({
  classId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.string(),
  dueAt: z.string().optional(),
  maxScore: z.coerce.number().optional(),
  content: z.unknown().optional(),
  status: z.string().optional(),
})

export const updateAssignmentSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  dueAt: z.string().optional(),
  content: z.unknown().optional(),
})
