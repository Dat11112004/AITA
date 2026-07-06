import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { IClassRepository } from '../../domain/repositories/class-repository.interface.js'
import { ConflictError, NotFoundError } from '../../../../shared/application/app.error.js'
import { CreateClassRequestDto, ClassResponseDto } from '../dtos/class.dto.js'
import { Class } from '../../domain/entities/class.entity.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class CreateClassUseCase implements IUseCase<CreateClassRequestDto, ReturnType<typeof ClassResponseDto.from>> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(dto: CreateClassRequestDto) {
    const { data } = dto

    // We can resolve the class repo outside transaction for reads
    const classRepo = this.uow.resolve<IClassRepository>(TOKENS.ClassRepository)
    const subjectRepo = this.uow.resolve<any>(TOKENS.SubjectRepository)
    const semesterRepo = this.uow.resolve<any>(TOKENS.SemesterRepository)
    const userRepo = this.uow.resolve<any>(TOKENS.UserRepository)
    
    const existingClass = await classRepo.findByCode(data.code)
    if (existingClass) {
      throw new ConflictError(MESSAGES.CLASS_ALREADY_EXISTS)
    }

    const subject = await subjectRepo.findById(data.subjectId)
    if (!subject) {
      throw new NotFoundError(MESSAGES.SUBJECT_NOT_FOUND)
    }

    const semester = await semesterRepo.findById(data.semesterId)
    if (!semester) {
      throw new NotFoundError('Không tìm thấy kỳ học')
    }

    if (data.lecturerId) {
      const lecturer = await userRepo.findById(data.lecturerId)
      if (!lecturer) {
        throw new NotFoundError(MESSAGES.INSTRUCTOR_NOT_FOUND)
      }
    }

    return this.uow.runInTransaction(async (txn) => {
      // Resolve transaction-bound repository
      const txClassRepo = txn.resolve<IClassRepository>(TOKENS.ClassRepository)

      const cls = Class.create(
        randomUUID(),
        data.code,
        data.subjectId,
        data.semesterId as string
      )

      await txClassRepo.create(cls)

      if (data.lecturerId) {
        await txClassRepo.assignInstructor(cls.id, data.lecturerId)
      }

      const finalClass = await txClassRepo.findById(cls.id)
      return ClassResponseDto.from(finalClass as any)
    })
  }
}
