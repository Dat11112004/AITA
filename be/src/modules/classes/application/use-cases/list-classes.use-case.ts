import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IClassRepository } from '../../domain/repositories/class.repository.interface.js'
import { ClassResponseDTO } from '../dtos/class.dtos.js'

export class ListClassesUseCase implements IUseCase<{ lecturerId?: string }, ClassResponseDTO[]> {
  constructor(private classRepository: IClassRepository) {}

  async execute(input: { lecturerId?: string }): Promise<ClassResponseDTO[]> {
    let classes

    if (input.lecturerId) {
      classes = await this.classRepository.findByLecturerId(input.lecturerId)
    } else {
      classes = await this.classRepository.listAll()
    }

    return classes.map(c => new ClassResponseDTO(
      c.id,
      c.code,
      c.name,
      c.subject,
      c.semester,
      c.lecturerId,
      c.campus,
      c.schedule,
      c.createdAt
    ))
  }
}
