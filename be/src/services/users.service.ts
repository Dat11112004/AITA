// @ts-nocheck
import bcrypt from 'bcryptjs'
import type { UserStatus } from '@prisma/client'
import { userRepository } from '../repositories/user.repository.js'
import { activityRepository } from '../repositories/activity.repository.js'
import { badRequest, notFound } from '../utils/errors.js'
import { mapUser } from '../utils/mappers.js'
import type { createUserSchema, updateUserSchema } from '../validations/users.validation.js'
import type { z } from 'zod'

export const usersService = {
  async list(roleParam: string) {
    const where: any = {}
    if (roleParam && roleParam !== 'all') {
      where.UserRole = { some: { Role: { RoleName: roleParam.toUpperCase() } } }
    }
    const users = await userRepository.findMany(where)
    return users.map(mapUser)
  },

  async create(payload: z.infer<typeof createUserSchema>, actorId: string) {
    if (await userRepository.findByEmail(payload.email)) {
      throw badRequest('Email đã tồn tại')
    }

    const user = await userRepository.create({
      Email: payload.email,
      PasswordHash: await bcrypt.hash(payload.password, 10),
      FullName: payload.fullName,
      StudentCode: payload.externalId,
    })

    // Assign role
    const role = await (await import('../database/prisma.js')).prisma.role.findFirst({
      where: { RoleName: (payload.role ?? 'STUDENT').toUpperCase() },
    })
    if (role) {
      await (await import('../database/prisma.js')).prisma.userRole.create({
        data: { UserId: user.Id, RoleId: role.Id },
      })
    }

    await activityRepository.create({
      userId: actorId,
      action: 'USER_CREATE',
      entity: 'User',
      entityId: user.Id,
    })

    return mapUser(user)
  },

  async update(id: string, payload: z.infer<typeof updateUserSchema>) {
    const user = await userRepository.findById(id)
    if (!user) throw notFound('Người dùng không tồn tại')

    const updated = await userRepository.update(id, {
      FullName: payload.fullName,
      StudentCode: payload.externalId,
      Status: payload.status ? (payload.status.toUpperCase() as UserStatus) : undefined,
    })

    return mapUser(updated)
  },

  async delete(id: string) {
    const user = await userRepository.findById(id)
    if (!user) throw notFound('Người dùng không tồn tại')
    await userRepository.delete(id)
  },

  async toggleLock(id: string, locked: boolean) {
    const user = await userRepository.findById(id)
    if (!user) throw notFound('Người dùng không tồn tại')

    const status = locked ? 'Suspended' : 'Active'
    const updated = await userRepository.update(id, { Status: status as UserStatus })
    return mapUser(updated)
  },
}
