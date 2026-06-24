import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { UserResponseDto } from '../dtos/user.dto.js'

export class ListUsersUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(role: string = 'all') {
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

        const users = await this.uow.userRepository.findMany(where)
        return users.map(UserResponseDto.from)
    }
}
