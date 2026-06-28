import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { Logger } from '../../../../shared/infrastructure/logger.js'
import { ClassResponseDto, UpdateClassNoteDto } from '../dtos/class.dto.js'

/**
 * Update a class's internal note. Readable/writable only by ADMIN or the owning LECTURER.
 * Ownership is derived from req.user, never the request body.
 */
export class UpdateClassNoteUseCase
  implements IUseCase<{ classId: string; dto: UpdateClassNoteDto; user: AuthUser }, ClassResponseDto>
{
  private readonly logger = new Logger('UpdateClassNoteUseCase')

  constructor(private readonly uow: IUnitOfWork) {}

  async execute({ classId, dto, user }: { classId: string; dto: UpdateClassNoteDto; user: AuthUser }): Promise<ClassResponseDto> {
    const cls = await this.uow.classRepository.findById(classId)
    if (!cls) {
      throw new NotFoundError('Lớp không tồn tại')
    }

    if (user.role === 'LECTURER') {
      const owns = cls.InstructorClass?.some((ic: any) => ic.UserId === user.id)
      if (!owns) {
        throw new ForbiddenError('Bạn không phụ trách lớp này')
      }
    }

    this.logger.info(`Updating note for class ${classId} by ${user.id}`)
    const updated = await this.uow.classRepository.update(classId, { Note: dto.note })
    return ClassResponseDto.from(updated, true)
  }
}
