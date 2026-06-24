import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { UpdateUserDto, UserResponseDto } from '../dtos/user.dto.js'
import { notFound } from '../../../../utils/errors.js'

export class UpdateUserUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(id: string, dto: UpdateUserDto) {
        const user = await this.uow.userRepository.findById(id)
        if (!user) throw notFound('Người dùng không tồn tại')

        const updated = await this.uow.userRepository.update(id, {
            FullName: dto.fullName,
            Email: dto.email,
            Status: dto.status === 'Locked' ? 'Suspended' : (dto.status === 'Active' ? 'Active' : undefined)
        })

        return UserResponseDto.from(updated)
    }
}
