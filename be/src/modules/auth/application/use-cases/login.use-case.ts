import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { AuthDomainService } from '../../domain/services/auth.domain.service.js'
import { IUserRepository } from '../../domain/repositories/user.repository.interface.js'
import { UnauthorizedError, ValidationError } from '../../../../shared/application/app.error.js'
import { LoginRequestDTO, LoginResponseDTO } from '../dtos/auth.dtos.js'

export class LoginUseCase implements IUseCase<LoginRequestDTO, LoginResponseDTO> {
  constructor(
    private userRepository: IUserRepository,
    private authDomainService: AuthDomainService,
    private tokenGenerator: (payload: any) => string
  ) {}

  async execute(input: LoginRequestDTO): Promise<LoginResponseDTO> {
    const emailValidation = this.authDomainService.validateEmail(input.email)
    if (!emailValidation.valid) {
      throw new ValidationError(emailValidation.message || 'Invalid email')
    }

    const user = await this.userRepository.findByEmail(input.email)
    if (!user || !user.isActive()) {
      throw new UnauthorizedError('Email hoặc mật khẩu không đúng')
    }

    const isPasswordValid = await this.authDomainService.comparePassword(
      input.password,
      user.passwordHash
    )
    if (!isPasswordValid) {
      throw new UnauthorizedError('Email hoặc mật khẩu không đúng')
    }

    const token = this.tokenGenerator({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    return new LoginResponseDTO(token, {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    })
  }
}
