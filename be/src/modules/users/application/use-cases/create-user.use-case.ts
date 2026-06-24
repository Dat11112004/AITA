import bcrypt from 'bcryptjs'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { CreateUserDto, UserResponseDto } from '../dtos/user.dto.js'
import { badRequest } from '../../../../utils/errors.js'

export class CreateUserUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(dto: CreateUserDto) {
        const existing = await this.uow.userRepository.findByEmail(dto.email)
        if (existing) throw badRequest('Email đã tồn tại')

        const passwordHash = await bcrypt.hash(dto.password, 10)

        // Using transaction for user + role creation
        return await this.uow.runInTransaction(async (tx) => {
            const user = await tx.userRepository.create({
                Email: dto.email,
                FullName: dto.fullName,
                PasswordHash: passwordHash,
                Status: 'Active'
            })

            // Assign role (logic simplified for brevity, should handle role lookup)
            // await tx.userRepository.assignRole(user.Id, dto.role) 

            return UserResponseDto.from(user)
        })
    }
}
