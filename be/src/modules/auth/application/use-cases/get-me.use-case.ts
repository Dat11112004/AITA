import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { GetMeResponseDTO } from '../dtos/auth.dtos.js'
import { IUserRepository } from '../../domain/repositories/user.repository.interface.js'
import { UnauthorizedError } from '../../../../shared/application/app.error.js'

export class GetMeUseCase implements IUseCase<string, GetMeResponseDTO> {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string): Promise<GetMeResponseDTO> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    return new GetMeResponseDTO(
      user.id,
      user.email,
      user.fullName,
      user.role,
      user.status,
      user.createdAt
    )
  }
}
