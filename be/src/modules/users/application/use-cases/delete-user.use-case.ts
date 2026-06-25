import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { notFound } from '../../../../utils/errors.js'

export class DeleteUserUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(id: string) {
        const user = await this.uow.userRepository.findById(id)
        if (!user) throw notFound('Người dùng không tồn tại')

        // Soft delete: Mark as inactive rather than hard delete
        await this.uow.userRepository.update(id, { Status: 'Suspended' })

        return { success: true, message: 'Người dùng đã bị xóa' }
    }
}
