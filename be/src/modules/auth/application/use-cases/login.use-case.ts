import bcrypt from 'bcryptjs'
import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { Logger } from '../../../../shared/infrastructure/logger.js'
import { UnauthorizedError } from '../../../../shared/application/app.error.js'
import { signToken } from '../../../../middleware/auth.js'
import { LoginRequestDto, AuthResponseDto } from '../dtos/auth.dto.js'

export class LoginUseCase implements IUseCase<LoginRequestDto, AuthResponseDto> {
  private readonly uow: IUnitOfWork
  private readonly logger = new Logger('LoginUseCase')

  constructor(uow: IUnitOfWork) {
    this.uow = uow
  }

  async execute(dto: LoginRequestDto): Promise<AuthResponseDto> {
    this.logger.info(`Attempting login for email: ${dto.email}`)

    const user = await this.uow.userRepository.findByEmail(dto.email)
    if (!user || user.Status !== 'Active') {
      this.logger.warn(`Login failed: User not found or inactive for email ${dto.email}`)
      throw new UnauthorizedError('Email hoặc mật khẩu không đúng')
    }

    if (!user.PasswordHash || !(await bcrypt.compare(dto.password, user.PasswordHash))) {
      this.logger.warn(`Login failed: Invalid password for user ID ${user.Id}`)
      throw new UnauthorizedError('Email hoặc mật khẩu không đúng')
    }

    const primaryRole = user.UserRole?.[0]?.Role?.RoleName ?? 'STUDENT'
    const authPayload = { id: user.Id, email: user.Email ?? '', role: primaryRole, fullName: user.FullName ?? '' }

    const token = signToken(authPayload)
    this.logger.info(`Login successful for user ID ${user.Id} (Role: ${primaryRole})`)

    return AuthResponseDto.from(token, user, primaryRole)
  }
}
