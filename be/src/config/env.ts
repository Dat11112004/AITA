import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  AI_STUB_MODE: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  AI_ENDPOINT: z.string().default('http://localhost:8000'),

})

export const env = schema.parse(process.env)
