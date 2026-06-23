import type { Request, Response } from 'express'
import { LoginUseCase } from '../application/use-cases/login.use-case.js'
import { RegisterStudentUseCase } from '../application/use-cases/register.use-case.js'
import { GetMeUseCase } from '../application/use-cases/get-me.use-case.js'
import { LoginRequestDto, RegisterStudentRequestDto } from '../application/dtos/auth.dto.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'
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

    res.status(200).json(ApiResponse.success('Đăng nhập thành công', result))
  }

  async register(req: Request, res: Response): Promise<void> {
    this.logger.info('Received student registration request')
    const dto = RegisterStudentRequestDto.from(req.body)
    const result = await this.registerStudentUseCase.execute(dto)

    res.status(201).json(ApiResponse.success('Đăng ký tài khoản thành công', result, 201))
  }

  async getMe(req: Request, res: Response): Promise<void> {
    this.logger.info(`Received getMe request for user: ${req.user?.id}`)
    const result = await this.getMeUseCase.execute(req.user!.id)

    res.status(200).json(ApiResponse.success('Lấy thông tin tài khoản thành công', result))
  }

  async logout(_req: Request, res: Response): Promise<void> {
    this.logger.info('Received logout request')
    res.status(200).json(ApiResponse.success('Đăng xuất thành công'))
  }
}
