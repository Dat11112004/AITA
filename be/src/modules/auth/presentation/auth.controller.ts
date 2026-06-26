import type { Request, Response } from 'express'
import { LoginUseCase } from '../application/use-cases/login.use-case.js'
import { RegisterStudentUseCase } from '../application/use-cases/register.use-case.js'
import { GetMeUseCase } from '../application/use-cases/get-me.use-case.js'
import { LoginRequestDto, RegisterStudentRequestDto } from '../application/dtos/auth.dto.js'
import { ok } from '../../../utils/response.js'
import { Logger } from '../../../shared/infrastructure/logger.js'

export class AuthController {
  private readonly loginUseCase: LoginUseCase
  private readonly registerStudentUseCase: RegisterStudentUseCase
  private readonly getMeUseCase: GetMeUseCase
  private readonly logger = new Logger('AuthController')

  constructor(
    loginUseCase: LoginUseCase,
    registerStudentUseCase: RegisterStudentUseCase,
    getMeUseCase: GetMeUseCase
  ) {
    this.loginUseCase = loginUseCase
    this.registerStudentUseCase = registerStudentUseCase
    this.getMeUseCase = getMeUseCase
  }

  async login(req: Request, res: Response): Promise<void> {
    this.logger.info('Received login request')
    const dto = LoginRequestDto.from(req.body)
    const result = await this.loginUseCase.execute(dto)

    ok(res, result, 200, 'Đăng nhập thành công')
  }

  async register(req: Request, res: Response): Promise<void> {
    this.logger.info('Received student registration request')
    const dto = RegisterStudentRequestDto.from(req.body)
    const result = await this.registerStudentUseCase.execute(dto)

    ok(res, result, 201, 'Đăng ký tài khoản thành công')
  }

  async getMe(req: Request, res: Response): Promise<void> {
    this.logger.info(`Received getMe request for user: ${req.user?.id}`)
    const result = await this.getMeUseCase.execute(req.user!.id)

    ok(res, result, 200, 'Lấy thông tin tài khoản thành công')
  }

  async logout(_req: Request, res: Response): Promise<void> {
    this.logger.info('Received logout request')
    ok(res, null, 200, 'Đăng xuất thành công')
  }
}
