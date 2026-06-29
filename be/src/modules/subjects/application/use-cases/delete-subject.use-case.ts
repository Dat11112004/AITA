import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface.js'
import { NotFoundError, ConflictError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class DeleteSubjectUseCase implements IUseCase<string, void> {
  constructor(private readonly subjectRepo: ISubjectRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.subjectRepo.findById(id)
    if (!existing) {
      throw new NotFoundError(MESSAGES.SUBJECT_NOT_FOUND)
    }

    // Ideally, we'd check if any classes belong to this subject
    // Example: const classes = await this.classRepo.findMany({ subjectId: id })
    // if (classes.length > 0) throw new ConflictError(MESSAGES.SUBJECT_HAS_CLASSES)
    // Assuming DB throws foreign key error if not explicitly checked:
    try {
      await this.subjectRepo.delete(id)
    } catch (e: any) {
      if (e.code === 'P2003') { // Prisma Foreign Key constraint
        throw new ConflictError(MESSAGES.SUBJECT_HAS_CLASSES)
      }
      throw e
    }
  }
}
