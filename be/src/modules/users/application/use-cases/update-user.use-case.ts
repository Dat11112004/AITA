import bcrypt from 'bcryptjs'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { UpdateUserDto, UserResponseDto } from '../dtos/user.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'

export class UpdateUserUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(id: string, dto: UpdateUserDto) {
        const user = await this.uow.userRepository.findById(id)
        if (!user) throw new NotFoundError('Người dùng không tồn tại')

        let passwordHash = undefined
        if (dto.password) {
            passwordHash = await bcrypt.hash(dto.password, 10)
        }

        await this.uow.userRepository.update(id, {
            FullName: dto.fullName,
            Email: dto.email,
            Status: dto.status === 'Locked' ? 'Inactive' : (dto.status === 'Active' ? 'Active' : undefined),
            PasswordHash: passwordHash
        })

        if (dto.role) {
            const targetRole = await this.uow.userRepository.findRoleByName(dto.role.toUpperCase())
            if (targetRole) {
                await this.uow.userRepository.assignRole(id, targetRole.Id)
            }
        }
        
        const finalUpdatedUser = await this.uow.userRepository.findById(id)
        return UserResponseDto.from(finalUpdatedUser)
    }
}
