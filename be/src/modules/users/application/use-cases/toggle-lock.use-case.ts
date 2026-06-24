import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { notFound } from '../../../../utils/errors.js'
import { UserResponseDto } from '../dtos/user.dto.js'

export class ToggleLockUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(id: string, locked: boolean) {
        const user = await this.uow.userRepository.findById(id)
        if (!user) throw notFound('Người dùng không tồn tại')

        const status = locked ? 'Suspended' : 'Active'
        const updated = await this.uow.userRepository.update(id, { Status: status as any })

        return UserResponseDto.from(updated)
    }
}
