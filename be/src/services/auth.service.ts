import bcrypt from 'bcryptjs'
import { userRepository } from '../repositories/user.repository.js'
import { activityRepository } from '../repositories/activity.repository.js'
import { unauthorized, badRequest } from '../utils/errors.js'
import { signToken } from '../middleware/auth.js'
import { mapUser } from '../utils/mappers.js'
import { loginSchema, registerStudentSchema } from '../validations/auth.validation.js'
import type { z } from 'zod'

export const authService = {
  async login(payload: z.infer<typeof loginSchema>) {
    console.log('Attempting login for email:', payload.email)
    const user = await userRepository.findByEmail(payload.email)
    if (!user || user.Status !== 'Active') {
      console.log('User not found or inactive for email:', payload.email)
      throw unauthorized('Email hoặc mật khẩu không đúng')
    }
    console.log('User found:', user.Id)
    if (!user.PasswordHash || !(await bcrypt.compare(payload.password, user.PasswordHash))) {
      console.log('Invalid password for user:', user.Id)
      throw unauthorized('Email hoặc mật khẩu không đúng')
    }
    console.log('Password matched for user:', user.Id)

    const primaryRole = user.UserRole?.[0]?.Role?.RoleName ?? 'STUDENT'
    const auth = { id: user.Id, email: user.Email ?? '', role: primaryRole, fullName: user.FullName ?? '' }
    console.log('Login successful for user:', user.Id, 'Role:', primaryRole)
    return { token: signToken(auth), user: mapUser(user) }
  },

  async registerStudent(payload: z.infer<typeof registerStudentSchema>) {
    if (await userRepository.findByEmail(payload.email)) {
      throw badRequest('Email đã được sử dụng')
    }

    const user = await userRepository.create({
      Email: payload.email.toLowerCase(),
      PasswordHash: await bcrypt.hash(payload.password, 10),
      FullName: payload.fullName,
      StudentCode: payload.externalId,
    })

    // Assign STUDENT role
    const prisma = (await import('../database/prisma.js')).prisma
    const studentRole = await prisma.role.findFirst({
      where: { RoleName: 'STUDENT' },
    })
    if (studentRole) {
      await prisma.userRole.create({
        data: { UserId: user.Id, RoleId: studentRole.Id },
      })
    }

    await activityRepository.create({
      userId: user.Id,
      action: 'STUDENT_REGISTER',
      entity: 'User',
      entityId: user.Id,
    })

    const auth = { id: user.Id, email: user.Email ?? '', role: 'STUDENT', fullName: user.FullName ?? '' }
    return { token: signToken(auth), user: mapUser(user) }
  },

  async getMe(userId: string) {
    const user = await userRepository.findById(userId)
    if (!user) throw unauthorized()
    return mapUser(user)
  },
}
