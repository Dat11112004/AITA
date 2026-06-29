import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { LoginUseCase } from '../application/use-cases/login.use-case.js'
import { RegisterStudentUseCase } from '../application/use-cases/register.use-case.js'
import { GetMeUseCase } from '../application/use-cases/get-me.use-case.js'
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case.js'
import { LogoutUseCase } from '../application/use-cases/logout.use-case.js'
import { ChangePasswordUseCase } from '../application/use-cases/change-password.use-case.js'
import { LoginRequestDto, RegisterStudentRequestDto, RefreshTokenRequestDto, LogoutRequestDto, ChangePasswordRequestDto } from '../application/dtos/auth.dto.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class AuthController extends BaseController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerStudentUseCase: RegisterStudentUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly logger: ILogger,
  ) {
    super()
  }

  async login(req: Request, res: Response): Promise<void> {
    this.logger.info('Received login request')
    const dto = LoginRequestDto.from(req.body)
    const result = await this.loginUseCase.execute({ dto })
    this.ok(res, result, MESSAGES.AUTH_LOGIN_SUCCESS)
  }

  async register(req: Request, res: Response): Promise<void> {
    this.logger.info('Received student registration request')
    const dto = RegisterStudentRequestDto.from(req.body)
    const result = await this.registerStudentUseCase.execute({ dto })
    this.created(res, result, MESSAGES.AUTH_REGISTER_SUCCESS)
  }

  async getMe(req: Request, res: Response): Promise<void> {
    this.logger.info(`Received getMe request for user: ${req.user?.id}`)
    const result = await this.getMeUseCase.execute(req.user!.id)
    this.ok(res, result, MESSAGES.AUTH_GET_ME_SUCCESS)
  }

  async logout(req: Request, res: Response): Promise<void> {
    this.logger.info('Received logout request')
    const dto = LogoutRequestDto.from(req.body)
    await this.logoutUseCase.execute({ dto })
    this.ok(res, null, MESSAGES.AUTH_LOGOUT_SUCCESS)
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    this.logger.info('Received refresh token request')
    const dto = RefreshTokenRequestDto.from(req.body)
    const result = await this.refreshTokenUseCase.execute({ dto })
    this.ok(res, result, MESSAGES.AUTH_REFRESH_SUCCESS)
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    this.logger.info(`Received change password request for user: ${req.user?.id}`)
    const dto = ChangePasswordRequestDto.from(req.body)
    await this.changePasswordUseCase.execute({ userId: req.user!.id, dto })
    this.ok(res, null, MESSAGES.AUTH_PASSWORD_CHANGED_SUCCESS)
  }
}
