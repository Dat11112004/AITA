import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IClassRepository } from '../../domain/repositories/class.repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { UpdateClassRequestDTO, ClassResponseDTO } from '../dtos/class.dtos.js'

export class UpdateClassUseCase implements IUseCase<{ id: string; data: UpdateClassRequestDTO }, ClassResponseDTO> {
  constructor(private classRepository: IClassRepository) {}

  async execute(input: { id: string; data: UpdateClassRequestDTO }): Promise<ClassResponseDTO> {
    const classEntity = await this.classRepository.findById(input.id)
    if (!classEntity) {
      throw new NotFoundError('Class not found')
    }

    if (input.data.name || input.data.subject || input.data.semester) {
      classEntity.updateBasicInfo(
        input.data.name || classEntity.name,
        input.data.subject || classEntity.subject,
        input.data.semester || classEntity.semester
      )
    }

    if (input.data.campus !== undefined || input.data.schedule !== undefined) {
      classEntity.updateSchedule(
        input.data.campus,
        input.data.schedule
      )
    }

    const updated = await this.classRepository.update(classEntity)

    return new ClassResponseDTO(
      updated.id,
      updated.code,
      updated.name,
      updated.subject,
      updated.semester,
      updated.lecturerId,
      updated.campus,
      updated.schedule
    )
  }
}
