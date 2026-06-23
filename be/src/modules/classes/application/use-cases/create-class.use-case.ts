import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { badRequest } from '../../../../utils/errors.js'
import { CreateClassRequestDto, ClassResponseDto } from '../dtos/class.dto.js'

export class CreateClassUseCase implements IUseCase<CreateClassRequestDto, ClassResponseDto> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(dto: CreateClassRequestDto): Promise<ClassResponseDto> {
    const { data } = dto

    const existingClass = await this.uow.classRepository.findByCode(data.code)
    if (existingClass) {
      throw badRequest('Mã lớp đã tồn tại')
    }

    return this.uow.runInTransaction(async (uow: IUnitOfWork) => {
      const cls = await uow.classRepository.create({
        ClassCode: data.code,
        SubjectId: data.subject,
        SemesterId: data.semester,
        Status: 'Active',
      })

      if (data.lecturerId) {
        await uow.classRepository.assignInstructor(cls.Id, data.lecturerId)
      }

      const finalClass = await uow.classRepository.findById(cls.Id)
      return ClassResponseDto.from(finalClass!)
    })
  }
}
