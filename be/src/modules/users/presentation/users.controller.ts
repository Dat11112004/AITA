import type { Request, Response } from 'express'
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js'
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js'
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js'
import { DeleteUserUseCase } from '../application/use-cases/delete-user.use-case.js'
import { ToggleLockUseCase } from '../application/use-cases/toggle-lock.use-case.js'
import { ok } from '../../../utils/response.js'
import { CreateUserDto, UpdateUserDto } from '../application/dtos/user.dto.js'

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
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const result = await this.listUseCase.execute(role, page, limit)
        ok(res, result, 200, 'Lấy danh sách người dùng thành công')
    }

    async create(req: Request, res: Response): Promise<void> {
        const dto = CreateUserDto.parse(req.body)
        const result = await this.createUseCase.execute(dto)
        ok(res, result, 201, 'Tạo người dùng thành công')
    }

    async update(req: Request, res: Response): Promise<void> {
        const dto = UpdateUserDto.parse(req.body)
        const result = await this.updateUseCase.execute(String(req.params.id), dto)
        ok(res, result, 200, 'Cập nhật người dùng thành công')
    }

    async delete(req: Request, res: Response): Promise<void> {
        const result = await this.deleteUseCase.execute(String(req.params.id))
        ok(res, result, 200, 'Xóa người dùng thành công')
    }

    async toggleLock(req: Request, res: Response): Promise<void> {
        const { locked } = req.body
        const result = await this.toggleLockUseCase.execute(String(req.params.id), locked)
        ok(res, result, 200, 'Cập nhật trạng thái khóa thành công')
    }
}
