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
    const user = await userRepository.findByEmail(payload.email)
    if (!user || user.status !== 'ACTIVE') throw unauthorized('Email hoặc mật khẩu không đúng')
    if (!(await bcrypt.compare(payload.password, user.passwordHash))) throw unauthorized('Email hoặc mật khẩu không đúng')

    const auth = { id: user.id, email: user.email, role: user.role, fullName: user.fullName }
    return { token: signToken(auth), user: mapUser(user) }
  },

  async registerStudent(payload: z.infer<typeof registerStudentSchema>) {
    if (await userRepository.findByEmail(payload.email)) {
      throw badRequest('Email đã được sử dụng')
    }

    const user = await userRepository.create({
      email: payload.email.toLowerCase(),
      passwordHash: await bcrypt.hash(payload.password, 10),
      fullName: payload.fullName,
      role: 'STUDENT',
      externalId: payload.externalId,
    })

    await activityRepository.create({
      userId: user.id,
      action: 'STUDENT_REGISTER',
      entity: 'User',
      entityId: user.id,
    })

    const auth = { id: user.id, email: user.email, role: user.role, fullName: user.fullName }
    return { token: signToken(auth), user: mapUser(user) }
  },

  async getMe(userId: string) {
    const user = await userRepository.findById(userId)
    if (!user) throw unauthorized()
    return mapUser(user)
  }
}
