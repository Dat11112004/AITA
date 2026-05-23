import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const registerStudentSchema = z.object({
  email: z
    .string()
    .email('Email không hợp lệ')
    .refine(
      (e) => e.toLowerCase().endsWith('@gmail.com'),
      'Chỉ chấp nhận email Gmail (@gmail.com)',
    ),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  externalId: z.string().optional(),
})
