import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'

export class DeleteUserUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(id: string) {
        const user = await this.uow.userRepository.findById(id)
        if (!user) throw new NotFoundError('Người dùng không tồn tại')

        // Soft delete: Mark as inactive rather than hard delete
        await this.uow.userRepository.update(id, { Status: 'Suspended' })

        return { success: true, message: 'Người dùng đã bị xóa' }
    }
}
