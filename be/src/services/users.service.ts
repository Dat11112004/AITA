import bcrypt from 'bcryptjs'
import type { UserRole, UserStatus } from '@prisma/client'
import { userRepository } from '../repositories/user.repository.js'
import { activityRepository } from '../repositories/activity.repository.js'
import { badRequest, notFound } from '../utils/errors.js'
import { mapUser } from '../utils/mappers.js'
import type { createUserSchema, updateUserSchema } from '../validations/users.validation.js'
import type { z } from 'zod'

const roleMap: Record<string, UserRole> = {
  admin: 'ADMIN',
  lecturer: 'LECTURER',
  student: 'STUDENT',
  ADMIN: 'ADMIN',
  LECTURER: 'LECTURER',
  STUDENT: 'STUDENT',
}

export const usersService = {
  async list(roleParam: string) {
    const where = roleParam && roleParam !== 'all' ? { role: roleMap[roleParam] ?? undefined } : {}
    const users = await userRepository.findMany(where)
    return users.map(mapUser)
  },

  async create(payload: z.infer<typeof createUserSchema>, actorId: string) {
    const role = roleMap[payload.role.toLowerCase()] ?? roleMap[payload.role]
    if (!role) throw badRequest('Vai trò không hợp lệ')

    if (await userRepository.findByEmail(payload.email)) {
      throw badRequest('Email đã tồn tại')
    }

    const user = await userRepository.create({
      email: payload.email,
      passwordHash: await bcrypt.hash(payload.password, 10),
      fullName: payload.fullName,
      role,
      externalId: payload.externalId,
    })

    await activityRepository.create({
      userId: actorId, 
      action: 'USER_CREATE', 
      entity: 'User', 
      entityId: user.id 
    })

    return mapUser(user)
  },

  async update(id: string, payload: z.infer<typeof updateUserSchema>) {
    const user = await userRepository.findById(id)
    if (!user) throw notFound('Người dùng không tồn tại')

    const updated = await userRepository.update(id, {
      fullName: payload.fullName,
      externalId: payload.externalId,
      status: payload.status ? (payload.status.toUpperCase() as UserStatus) : undefined,
    })
    
    return mapUser(updated)
  }
}
