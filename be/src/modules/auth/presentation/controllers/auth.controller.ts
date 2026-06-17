import type { Request, Response } from 'express'
import { LoginUseCase } from '../../application/use-cases/login.use-case.js'
import { RegisterUseCase } from '../../application/use-cases/register.use-case.js'
import { GetMeUseCase } from '../../application/use-cases/get-me.use-case.js'
import { LoginRequestDTO, RegisterRequestDTO } from '../../application/dtos/auth.dtos.js'
import { ok } from '../../../../utils/response.js'
import { logger } from '../../../../shared/infrastructure/logger.js'

export class AuthController {
  constructor(
    private loginUseCase: LoginUseCase,
    private registerUseCase: RegisterUseCase,
    private getMeUseCase: GetMeUseCase
  ) {}

  async login(req: Request, res: Response) {
    try {
      const dto = new LoginRequestDTO(req.body.email, req.body.password)
      const result = await this.loginUseCase.execute(dto)
      ok(res, result.toJSON())
    } catch (error) {
      logger.error('Login failed', error as Error)
      throw error
    }
  }

  async register(req: Request, res: Response) {
    try {
      const dto = new RegisterRequestDTO(
        req.body.email,
        req.body.password,
        req.body.fullName,
        req.body.externalId
      )
      const result = await this.registerUseCase.execute(dto)
      ok(res, result.toJSON(), 201)
    } catch (error) {
      logger.error('Registration failed', error as Error)
      throw error
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      const result = await this.getMeUseCase.execute(req.user!.id)
      ok(res, result.toJSON())
    } catch (error) {
      logger.error('Get me failed', error as Error)
      throw error
    }
  }
}
