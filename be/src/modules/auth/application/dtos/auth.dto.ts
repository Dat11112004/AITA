import { z } from 'zod'

export class LoginRequestDto {
  email!: string
  password!: string

  static readonly schema = z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(6, 'Mật khẩu phải chứa ít nhất 6 ký tự'),
  })

  static from(data: unknown): LoginRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new LoginRequestDto()
    dto.email = parsed.email
    dto.password = parsed.password
    return dto
  }
}

export class RegisterStudentRequestDto {
  email!: string
  password!: string
  fullName!: string
  externalId?: string

  static readonly schema = z.object({
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

  static from(data: unknown): RegisterStudentRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new RegisterStudentRequestDto()
    dto.email = parsed.email
    dto.password = parsed.password
    dto.fullName = parsed.fullName
    dto.externalId = parsed.externalId
    return dto
  }
}

export class AuthResponseDto {
  token!: string
  user!: {
    id: string
    email: string | null
    fullName: string | null
    studentCode: string | null
    avatar: string | null
    role: string
    status: string | null
  }

  static from(token: string, user: any): AuthResponseDto {
    const dto = new AuthResponseDto()
    dto.token = token
    dto.user = {
      id: user.id || user.Id,
      email: user.email || user.Email,
      fullName: user.fullName || user.FullName,
      studentCode: user.studentCode || user.StudentCode,
      avatar: user.avatar || user.Avatar,
      role: user.role || 'STUDENT',
      status: user.status || user.Status
    }
    return dto
  }
}
