import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED'

export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly role: UserRole
  ) {
    super('UserCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      userId: this.userId,
      email: this.email,
      role: this.role,
      occurredAt: this.occurredAt,
    }
  }
}

export class User extends AggregateRoot {
  id: string
  email: string
  fullName: string
  passwordHash: string
  role: UserRole
  status: UserStatus
  externalId?: string
  createdAt: Date
  updatedAt: Date

  private constructor(
    id: string,
    email: string,
    fullName: string,
    passwordHash: string,
    role: UserRole,
    status: UserStatus,
    externalId?: string,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    super()
    this.id = id
    this.email = email
    this.fullName = fullName
    this.passwordHash = passwordHash
    this.role = role
    this.status = status
    this.externalId = externalId
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  static create(
    id: string,
    email: string,
    fullName: string,
    passwordHash: string,
    role: UserRole = 'STUDENT',
    externalId?: string
  ): User {
    const user = new User(id, email, fullName, passwordHash, role, 'ACTIVE', externalId)
    user.addDomainEvent(new UserCreatedEvent(user.id, user.email, user.role))
    return user
  }

  static restore(
    id: string,
    email: string,
    fullName: string,
    passwordHash: string,
    role: UserRole,
    status: UserStatus,
    externalId?: string,
    createdAt?: Date,
    updatedAt?: Date
  ): User {
    return new User(id, email, fullName, passwordHash, role, status, externalId, createdAt, updatedAt)
  }

  isActive(): boolean {
    return this.status === 'ACTIVE'
  }

  isLecturer(): boolean {
    return this.role === 'LECTURER'
  }

  isStudent(): boolean {
    return this.role === 'STUDENT'
  }

  isAdmin(): boolean {
    return this.role === 'ADMIN'
  }

  updateProfile(fullName: string): void {
    this.fullName = fullName
    this.updatedAt = new Date()
  }

  deactivate(): void {
    this.status = 'INACTIVE'
    this.updatedAt = new Date()
  }

  ban(): void {
    this.status = 'BANNED'
    this.updatedAt = new Date()
  }
}
