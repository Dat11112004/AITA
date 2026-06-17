import { prisma } from '../../../../database/prisma.js'
import { IUserRepository } from '../../domain/repositories/user.repository.interface.js'
import { User, UserStatus, UserRole } from '../../domain/entities/user.entity.js'

export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const userData = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!userData) return null

    return User.restore(
      userData.id,
      userData.email,
      userData.fullName,
      userData.passwordHash,
      userData.role as UserRole,
      userData.status as UserStatus,
      userData.externalId || undefined,
      userData.createdAt,
      userData.updatedAt
    )
  }

  async findById(id: string): Promise<User | null> {
    const userData = await prisma.user.findUnique({
      where: { id },
    })

    if (!userData) return null

    return User.restore(
      userData.id,
      userData.email,
      userData.fullName,
      userData.passwordHash,
      userData.role as UserRole,
      userData.status as UserStatus,
      userData.externalId || undefined,
      userData.createdAt,
      userData.updatedAt
    )
  }

  async create(user: User): Promise<User> {
    const savedData = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email.toLowerCase(),
        fullName: user.fullName,
        passwordHash: user.passwordHash,
        role: user.role as any,
        status: user.status as any,
        externalId: user.externalId,
      },
    })

    return User.restore(
      savedData.id,
      savedData.email,
      savedData.fullName,
      savedData.passwordHash,
      savedData.role as UserRole,
      savedData.status as UserStatus,
      savedData.externalId || undefined,
      savedData.createdAt,
      savedData.updatedAt
    )
  }

  async update(user: User): Promise<User> {
    const updatedData = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: user.fullName,
        status: user.status as any,
        passwordHash: user.passwordHash,
        updatedAt: new Date(),
      },
    })

    return User.restore(
      updatedData.id,
      updatedData.email,
      updatedData.fullName,
      updatedData.passwordHash,
      updatedData.role as UserRole,
      updatedData.status as UserStatus,
      updatedData.externalId || undefined,
      updatedData.createdAt,
      updatedData.updatedAt
    )
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    })
  }

  async exists(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email: email.toLowerCase() },
    })
    return count > 0
  }
}
