import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { User } from '../../domain/entities/user.entity.js'
import { AuthDomainService } from '../../domain/services/auth.domain.service.js'
import { IUserRepository } from '../../domain/repositories/user.repository.interface.js'
import { ConflictError, ValidationError } from '../../../../shared/application/app.error.js'
import { RegisterRequestDTO, LoginResponseDTO } from '../dtos/auth.dtos.js'
import { v4 as uuidv4 } from 'uuid'

export class RegisterUseCase implements IUseCase<RegisterRequestDTO, LoginResponseDTO> {
  constructor(
    private userRepository: IUserRepository,
    private authDomainService: AuthDomainService,
    private tokenGenerator: (payload: any) => string
  ) {}

  async execute(input: RegisterRequestDTO): Promise<LoginResponseDTO> {
    const emailValidation = this.authDomainService.validateEmail(input.email)
    if (!emailValidation.valid) {
      throw new ValidationError(emailValidation.message || 'Invalid email')
    }

    const passwordValidation = this.authDomainService.validatePasswordStrength(input.password)
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.message || 'Password too weak')
    }

    const existingUser = await this.userRepository.findByEmail(input.email)
    if (existingUser) {
      throw new ConflictError('Email đã được sử dụng')
    }

    const hashedPassword = await this.authDomainService.hashPassword(input.password)
    const userId = uuidv4()
    const user = User.create(
      userId,
      input.email.toLowerCase(),
      input.fullName,
      hashedPassword,
      'STUDENT',
      input.externalId
    )

    const savedUser = await this.userRepository.create(user)
    const token = this.tokenGenerator({
      id: savedUser.id,
      email: savedUser.email,
      fullName: savedUser.fullName,
      role: savedUser.role,
    })

    return new LoginResponseDTO(token, {
      id: savedUser.id,
      email: savedUser.email,
      fullName: savedUser.fullName,
      role: savedUser.role,
    })
  }
}
