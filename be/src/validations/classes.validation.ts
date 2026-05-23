import { z } from 'zod'

export const createClassSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  subject: z.string().optional(),
  semester: z.string().optional(),
  campus: z.string().optional(),
  schedule: z.string().optional(),
  lecturerId: z.string(),
})

export const enrollSchema = z.object({
  studentId: z.string()
})
