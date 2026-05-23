import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.string(),
  externalId: z.string().optional(),
})

export const updateUserSchema = z.object({
  fullName: z.string().optional(),
  status: z.string().optional(),
  externalId: z.string().optional(),
})
