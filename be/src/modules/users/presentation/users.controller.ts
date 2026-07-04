import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js'
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js'
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js'
import { DeleteUserUseCase } from '../application/use-cases/delete-user.use-case.js'
import { ToggleLockUseCase } from '../application/use-cases/toggle-lock.use-case.js'
import { ImportUsersUseCase } from '../application/use-cases/import-users.use-case.js'
import { CreateUserDto, UpdateUserDto, ImportUsersBatchDto } from '../application/dtos/user.dto.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class UsersController extends BaseController {
    constructor(
        private readonly listUseCase: ListUsersUseCase,
        private readonly createUseCase: CreateUserUseCase,
        private readonly updateUseCase: UpdateUserUseCase,
        private readonly deleteUseCase: DeleteUserUseCase,
        private readonly toggleLockUseCase: ToggleLockUseCase,
        private readonly importUseCase: ImportUsersUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async list(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received list users request')
        const role = String(req.query.role ?? 'all')
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const result = await this.listUseCase.execute({ role, page, limit })
        this.ok(res, result, MESSAGES.USER_LIST_SUCCESS)
    }

    async create(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received create user request')
        const dto = CreateUserDto.parse(req.body)
        const result = await this.createUseCase.execute(dto)
        this.created(res, result, MESSAGES.USER_CREATE_SUCCESS)
    }

    async update(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received update user request for ID: ${req.params.id}`)
        const dto = UpdateUserDto.parse(req.body)
        const result = await this.updateUseCase.execute({ id: String(req.params.id), dto })
        this.ok(res, result, MESSAGES.USER_UPDATE_SUCCESS)
    }

    async delete(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received delete user request for ID: ${req.params.id}`)
        const result = await this.deleteUseCase.execute(String(req.params.id))
        this.ok(res, result, MESSAGES.USER_DELETE_SUCCESS)
    }

    async toggleLock(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received toggle lock request for ID: ${req.params.id}`)
        const { locked } = req.body
        const result = await this.toggleLockUseCase.execute({ id: String(req.params.id), locked })
        this.ok(res, result, MESSAGES.USER_TOGGLE_LOCK_SUCCESS)
    }

    async import(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received import users request')
        const dto = ImportUsersBatchDto.parse(req.body)
        const result = await this.importUseCase.execute(dto)
        this.created(res, result, 'Users imported successfully')
    }
}
