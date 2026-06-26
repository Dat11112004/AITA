import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { UserResponseDto } from '../dtos/user.dto.js'

export class ListUsersUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(role: string = 'all', page: number = 1, limit: number = 10) {
        const where: any = {}
        if (role !== 'all') {
            where.UserRole = {
                some: {
                    Role: {
                        RoleName: role.toUpperCase()
                    }
                }
            }
        }

        const skip = (page - 1) * limit
        const users = await this.uow.userRepository.findMany({ where, skip, take: limit })
        return users.map(UserResponseDto.from)
    }
}
