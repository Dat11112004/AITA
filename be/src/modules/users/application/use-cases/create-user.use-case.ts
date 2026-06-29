import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../domain/repositories/user-repository.interface.js'
import type { IHashService } from '../../../../shared/application/ports/i-hash-service.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { CreateUserDto, UserResponseDto } from '../dtos/user.dto.js'
import { ConflictError } from '../../../../shared/application/app.error.js'
import { User, type UserRoleType } from '../../../auth/domain/entities/user.entity.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class CreateUserUseCase implements IUseCase<CreateUserDto, UserResponseDto> {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly uow: IUnitOfWork,
        private readonly hashService: IHashService,
        private readonly logger: ILogger
    ) { }

    async execute(dto: CreateUserDto): Promise<UserResponseDto> {
        this.logger.info(`Creating user with email: ${dto.email}`)
        
        const existing = await this.userRepo.findByEmail(dto.email)
        if (existing) {
            this.logger.warn(`Failed to create user. Email already exists: ${dto.email}`)
            throw new ConflictError(MESSAGES.USER_EMAIL_EXISTS)
        }

        const passwordHash = await this.hashService.hash(dto.password)
        const role = dto.role as UserRoleType

        return this.uow.runInTransaction(async (txUow) => {
            const txUserRepo = txUow.resolve<IUserRepository>(TOKENS.UserRepository)

            const user = User.create(
                randomUUID(),
                dto.email.toLowerCase(),
                dto.fullName,
                passwordHash,
                role
            )

            await txUserRepo.create(user)

            const roleInfo = await txUserRepo.findRoleByName(role)
            if (roleInfo) {
                await txUserRepo.assignRole(user.id, roleInfo.id)
            } else {
                this.logger.warn(`Role not found in DB: ${role}`)
            }

            this.logger.info(`Successfully created user: ${user.id}`)
            return UserResponseDto.from(user)
        })
    }
}
