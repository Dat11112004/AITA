import { IUserRepository } from '../../../modules/users/domain/repositories/user-repository.interface.js'
import { IActivityRepository } from '../../../modules/auth/domain/repositories/activity-repository.interface.js'
import { IClassRepository } from '../../../modules/classes/domain/repositories/class-repository.interface.js'
import { IEnrollmentRepository } from '../../../modules/classes/domain/repositories/enrollment-repository.interface.js'
import { ISubjectRepository } from '../../../modules/subjects/domain/repositories/subject-repository.interface.js'
import { IExamRepository } from '../../../modules/exams/domain/repositories/exam-repository.interface.js'
import { ISubmissionRepository } from '../../../modules/submissions/domain/repositories/submission-repository.interface.js'

export interface IUnitOfWork {
  readonly userRepository: IUserRepository
  readonly activityRepository: IActivityRepository
  readonly classRepository: IClassRepository
  readonly enrollmentRepository: IEnrollmentRepository
  readonly subjectRepository: ISubjectRepository
  readonly examRepository: IExamRepository
  readonly submissionRepository: ISubmissionRepository

  /**
   * Run a set of operations within a database transaction.
   * If any operation fails, the entire transaction is rolled back.
   */
  getRepo<T>(RepoClass: new (client: any) => T): T

  runInTransaction<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T>
}
