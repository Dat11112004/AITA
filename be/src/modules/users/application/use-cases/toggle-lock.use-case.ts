import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { UserResponseDto } from '../dtos/user.dto.js'

export class ToggleLockUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(id: string, locked: boolean) {
        const user = await this.uow.userRepository.findById(id)
        if (!user) throw new NotFoundError('Người dùng không tồn tại')

        const status = locked ? 'Inactive' : 'Active'
        const updated = await this.uow.userRepository.update(id, { Status: status })

        return UserResponseDto.from(updated)
    }
}
