import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../domain/repositories/user-repository.interface.js'
import type { IHashService } from '../../../../shared/application/ports/i-hash-service.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { UpdateUserDto, UserResponseDto } from '../dtos/user.dto.js'
import { NotFoundError, ConflictError } from '../../../../shared/application/app.error.js'
import type { UserRoleType } from '../../../auth/domain/entities/user.entity.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export interface UpdateUserInput {
    id: string
    dto: UpdateUserDto
}

export class UpdateUserUseCase implements IUseCase<UpdateUserInput, UserResponseDto> {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly hashService: IHashService,
        private readonly logger: ILogger
    ) { }

    async execute({ id, dto }: UpdateUserInput): Promise<UserResponseDto> {
        this.logger.info(`Updating user: ${id}`)
        
        const user = await this.userRepo.findById(id)
        if (!user) throw new NotFoundError(MESSAGES.USER_NOT_FOUND)

        if (dto.email && dto.email.toLowerCase() !== user.email) {
            const existingEmail = await this.userRepo.findByEmail(dto.email.toLowerCase())
            if (existingEmail) {
                throw new ConflictError(MESSAGES.USER_EMAIL_EXISTS)
            }
        }

        // Apply domain updates
        user.updateProfile({
            fullName: dto.fullName,
        })
        
        if (dto.email) user.email = dto.email.toLowerCase()

        if (dto.status === 'Locked') user.suspend()
        else if (dto.status === 'Inactive') user.deactivate()
        else if (dto.status === 'Active') user.activate()

        if (dto.password) {
            const passwordHash = await this.hashService.hash(dto.password)
            user.changePassword(passwordHash)
        }

        await this.userRepo.save(user)

        if (dto.role) {
            const targetRole = await this.userRepo.findRoleByName(dto.role.toUpperCase())
            if (targetRole) {
                await this.userRepo.assignRole(id, targetRole.id)
                user.assignRole(dto.role.toUpperCase() as UserRoleType)
            }
        }
        
        return UserResponseDto.from(user)
    }
}
