import { User } from '../entities/user.entity.js'

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  create(user: User): Promise<User>
  update(user: User): Promise<User>
  delete(id: string): Promise<void>
  exists(email: string): Promise<boolean>
}
