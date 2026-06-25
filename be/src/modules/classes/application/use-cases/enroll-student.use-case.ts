import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { EnrollStudentRequestDto } from '../dtos/class.dto.js'
import { notFound, forbidden, badRequest } from '../../../../utils/errors.js'

interface AuthUser {
  id: string
  role: string
}

export class EnrollStudentUseCase implements IUseCase<{ classId: string; dto: EnrollStudentRequestDto; user: AuthUser }, any> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute(params: { classId: string; dto: EnrollStudentRequestDto; user: AuthUser }): Promise<any> {
    const { classId, dto, user } = params

    // Authorization: Only LECTURER or ADMIN can enroll
    const cls = await this.uow.classRepository.findById(classId)
    if (!cls) {
      throw notFound('Lớp không tồn tại')
    }

    const isInstructor = cls.InstructorClass?.some((ic: any) => ic.UserId === user.id)
    if (user.role !== 'ADMIN' && !isInstructor) {
      throw forbidden('Chỉ giảng viên hoặc quản trị viên mới có thể tuyển sinh')
    }

    // Validate student exists and is active
    const student = await this.uow.userRepository.findById(dto.data.studentId)
    if (!student) {
      throw notFound('Sinh viên không tồn tại')
    }

    if (student.Status !== 'Active') {
      throw badRequest('Sinh viên này không hoạt động')
    }

    // Prevent duplicate enrollment
    const existingEnrollment = await this.uow.enrollmentRepository.findMany({
      ClassId: classId,
      UserId: dto.data.studentId,
    })

    if (existingEnrollment && existingEnrollment.length > 0) {
      throw badRequest('Sinh viên đã được tuyển sinh vào lớp này')
    }

    const enrollment = await this.uow.enrollmentRepository.create({
      ClassId: classId,
      UserId: dto.data.studentId,
    })

    return enrollment
  }
}
