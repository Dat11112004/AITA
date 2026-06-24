import type { Request, Response } from 'express'
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js'
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js'
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js'
import { DeleteUserUseCase } from '../application/use-cases/delete-user.use-case.js'
import { ToggleLockUseCase } from '../application/use-cases/toggle-lock.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'


export class UsersController {
    constructor(
        private readonly listUseCase: ListUsersUseCase,
        private readonly createUseCase: CreateUserUseCase,
        private readonly updateUseCase: UpdateUserUseCase,
        private readonly deleteUseCase: DeleteUserUseCase,
        private readonly toggleLockUseCase: ToggleLockUseCase
    ) { }

    async list(req: Request, res: Response): Promise<void> {
        const role = String(req.query.role ?? 'all')
        const result = await this.listUseCase.execute(role)
        res.status(200).json(ApiResponse.success('Lấy danh sách người dùng thành công', result))
    }

    async create(req: Request, res: Response): Promise<void> {
        const result = await this.createUseCase.execute(req.body)
        res.status(201).json(ApiResponse.success('Tạo người dùng thành công', result, 201))
    }

    async update(req: Request, res: Response): Promise<void> {
        const result = await this.updateUseCase.execute(String(req.params.id), req.body)
        res.status(200).json(ApiResponse.success('Cập nhật người dùng thành công', result))
    }

    async delete(req: Request, res: Response): Promise<void> {
        const result = await this.deleteUseCase.execute(String(req.params.id))
        res.status(200).json(ApiResponse.success('Xóa người dùng thành công', result))
    }

    async toggleLock(req: Request, res: Response): Promise<void> {
        const { locked } = req.body
        const result = await this.toggleLockUseCase.execute(String(req.params.id), locked)
        res.status(200).json(ApiResponse.success('Cập nhật trạng thái khóa thành công', result))
    }
}
