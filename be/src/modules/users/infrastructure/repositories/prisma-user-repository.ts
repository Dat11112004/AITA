import type { Prisma } from '../../../../database/prisma.js'
import { IUserRepository, UserWithRoles } from '../../domain/repositories/user-repository.interface.js'

export class PrismaUserRepository implements IUserRepository {
  private client: any

  private get include() {
    return { UserRole: { include: { Role: true } } }
  }

  constructor(client: any) {
    this.client = client
  }

  async findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.client.user.findUnique({
      where: { Email: email },
      include: { UserRole: { include: { Role: true } } },
    })
  }

  async findById(id: string): Promise<UserWithRoles | null> {
    return this.client.user.findUnique({
      where: { Id: id },
      include: this.include,
    })
  }

  async findMany(params?: { where?: Prisma.UserWhereInput, skip?: number, take?: number }): Promise<UserWithRoles[]> {
    return this.client.user.findMany({ 
      where: params?.where,
      skip: params?.skip,
      take: params?.take,
      include: this.include,
      orderBy: { Id: 'desc' },
    })
  }

  async create(data: Prisma.UserUncheckedCreateInput): Promise<UserWithRoles> {
    return this.client.user.create({
      data,
      include: { UserRole: { include: { Role: true } } },
    })
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<UserWithRoles> {
    return this.client.user.update({
      where: { Id: id },
      data,
      include: { UserRole: { include: { Role: true } } },
    })
  }

  async delete(id: string): Promise<UserWithRoles> {
    return this.client.user.delete({
      where: { Id: id },
      include: { UserRole: { include: { Role: true } } },
    })
  }

  async count(): Promise<number> {
    return this.client.user.count()
  }

  async findRoleByName(roleName: string): Promise<any> {
    return this.client.role.findFirst({
      where: { RoleName: roleName },
    })
  }

  async assignRole(userId: string, roleId: string): Promise<any> {
    await this.client.userRole.deleteMany({
      where: { UserId: userId }
    })
    return this.client.userRole.create({
      data: { UserId: userId, RoleId: roleId },
    })
  }
}

