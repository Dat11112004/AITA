import { BaseDTO } from '../../../../shared/application/base-use-case.js'

export class LoginRequestDTO extends BaseDTO {
  constructor(
    public readonly email: string,
    public readonly password: string
  ) {
    super()
  }

  toJSON() {
    return {
      email: this.email,
      password: '***',
    }
  }
}

export class LoginResponseDTO extends BaseDTO {
  constructor(
    public readonly token: string,
    public readonly user: {
      id: string
      email: string
      fullName: string
      role: string
    }
  ) {
    super()
  }

  toJSON() {
    return {
      token: this.token,
      user: this.user,
    }
  }
}

export class RegisterRequestDTO extends BaseDTO {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly fullName: string,
    public readonly externalId?: string
  ) {
    super()
  }

  toJSON() {
    return {
      email: this.email,
      fullName: this.fullName,
      externalId: this.externalId,
    }
  }
}

export class GetMeResponseDTO extends BaseDTO {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly role: string,
    public readonly status: string,
    public readonly createdAt: Date
  ) {
    super()
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      role: this.role,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
    }
  }
}
