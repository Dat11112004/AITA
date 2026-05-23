import type { User } from '@prisma/client'

export function toPublicUser(u: User) {
  const { passwordHash: _, ...rest } = u
  return {
    ...rest,
    name: u.fullName,
    role: u.role.toLowerCase(),
    status: u.status.toLowerCase(),
  }
}
