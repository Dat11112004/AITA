import type { Prisma } from '../../../../database/prisma.js'

/**
 * Prisma User type with eager-loaded UserRole → Role.
 * This is the shape every repository query returns.
 */
export type UserWithRoles = Prisma.UserGetPayload<{
  include: { UserRole: { include: { Role: true } } }
}>

export interface IUserRepository {
  findByEmail(email: string): Promise<UserWithRoles | null>
  findById(id: string): Promise<UserWithRoles | null>
  findMany(params?: { where?: Prisma.UserWhereInput, skip?: number, take?: number }): Promise<UserWithRoles[]>
  create(data: Prisma.UserUncheckedCreateInput): Promise<UserWithRoles>
  update(id: string, data: Prisma.UserUpdateInput): Promise<UserWithRoles>
  delete(id: string): Promise<UserWithRoles>
  count(): Promise<number>
  findRoleByName(roleName: string): Promise<{ Id: string; RoleName: string | null } | null>
  assignRole(userId: string, roleId: string): Promise<any>
}
