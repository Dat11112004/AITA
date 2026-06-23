import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { Logger } from '../../../../shared/infrastructure/logger.js'
import { unauthorized } from '../../../../utils/errors.js'
import { mapUser } from '../../../../utils/mappers.js'

export class GetMeUseCase implements IUseCase<string, any> {
  private readonly uow: IUnitOfWork
  private readonly logger = new Logger('GetMeUseCase')

  constructor(uow: IUnitOfWork) {
    this.uow = uow
  }

  async execute(userId: string): Promise<any> {
    this.logger.info(`Fetching current user details for user ID: ${userId}`)
    const user = await this.uow.userRepository.findById(userId)
    if (!user) {
      this.logger.warn(`User details fetch failed: User not found for ID: ${userId}`)
      throw unauthorized()
    }
    return mapUser(user)
  }
}
