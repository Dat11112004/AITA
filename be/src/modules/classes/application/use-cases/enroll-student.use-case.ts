import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { EnrollStudentRequestDto } from '../dtos/class.dto.js'
import { notFound } from '../../../../utils/errors.js'

export class EnrollStudentUseCase implements IUseCase<{ classId: string; dto: EnrollStudentRequestDto }, any> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(params: { classId: string; dto: EnrollStudentRequestDto }): Promise<any> {
    const { classId, dto } = params
    
    const cls = await this.uow.classRepository.findById(classId)
    if (!cls) {
      throw notFound('Lớp không tồn tại')
    }

    const enrollment = await this.uow.enrollmentRepository.create({
      ClassId: classId,
      UserId: dto.data.studentId,
    })
    
    return enrollment
  }
}
