import bcrypt from 'bcryptjs'
import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { Logger } from '../../../../shared/infrastructure/logger.js'
import { badRequest } from '../../../../utils/errors.js'
import { signToken } from '../../../../middleware/auth.js'
import { mapUser } from '../../../../utils/mappers.js'
import { RegisterStudentRequestDto, AuthResponseDto } from '../dtos/auth.dto.js'

export class RegisterStudentUseCase implements IUseCase<RegisterStudentRequestDto, AuthResponseDto> {
  private readonly uow: IUnitOfWork
  private readonly logger = new Logger('RegisterStudentUseCase')

  constructor(uow: IUnitOfWork) {
    this.uow = uow
  }

  async execute(dto: RegisterStudentRequestDto): Promise<AuthResponseDto> {
    this.logger.info(`Attempting student registration for email: ${dto.email}`)

    const existingUser = await this.uow.userRepository.findByEmail(dto.email)
    if (existingUser) {
      this.logger.warn(`Registration failed: Email already in use: ${dto.email}`)
      throw badRequest('Email đã được sử dụng')
    }

    return this.uow.runInTransaction(async (transactionalUow) => {
      const hashedPassword = await bcrypt.hash(dto.password, 10)

      this.logger.info('Creating User record in transaction')
      const user = await transactionalUow.userRepository.create({
        Email: dto.email.toLowerCase(),
        PasswordHash: hashedPassword,
        FullName: dto.fullName,
        StudentCode: dto.externalId,
      })

      this.logger.info('Fetching STUDENT role in transaction')
      const studentRole = await transactionalUow.userRepository.findRoleByName('STUDENT')
      if (studentRole) {
        this.logger.info(`Assigning STUDENT role to user ID: ${user.Id}`)
        await transactionalUow.userRepository.assignRole(user.Id, studentRole.Id)
      } else {
        this.logger.warn('STUDENT role was not found in the database.')
      }

      this.logger.info(`Creating audit log for STUDENT_REGISTER (user ID: ${user.Id})`)
      await transactionalUow.activityRepository.create({
        userId: user.Id,
        action: 'STUDENT_REGISTER',
        entity: 'User',
        entityId: user.Id,
      })

      const authPayload = { id: user.Id, email: user.Email ?? '', role: 'STUDENT', fullName: user.FullName ?? '' }
      const token = signToken(authPayload)

      this.logger.info(`Student registered successfully: user ID: ${user.Id}`)

      const userWithRoles = await transactionalUow.userRepository.findById(user.Id)

      return AuthResponseDto.from(token, mapUser(userWithRoles || user))
    })
  }
}
