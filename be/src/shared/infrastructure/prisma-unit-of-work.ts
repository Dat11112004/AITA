import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma.js'
import { IUnitOfWork } from '../application/ports/unit-of-work.interface.js'
import { IUserRepository } from '../../modules/users/domain/repositories/user-repository.interface.js'
import { IActivityRepository } from '../../modules/auth/domain/repositories/activity-repository.interface.js'
import { IClassRepository } from '../../modules/classes/domain/repositories/class-repository.interface.js'
import { IEnrollmentRepository } from '../../modules/classes/domain/repositories/enrollment-repository.interface.js'
import { ISubjectRepository } from '../../modules/subjects/domain/repositories/subject-repository.interface.js'
import { IExamRepository } from '../../modules/exams/domain/repositories/exam-repository.interface.js'
import { ISettingsRepository } from '../../modules/settings/domain/repositories/settings-repository.interface.js'
import { PrismaUserRepository } from '../../modules/users/infrastructure/repositories/prisma-user-repository.js'
import { PrismaActivityRepository } from '../../modules/auth/infrastructure/repositories/prisma-activity-repository.js'
import { PrismaClassRepository } from '../../modules/classes/infrastructure/repositories/prisma-class-repository.js'
import { PrismaEnrollmentRepository } from '../../modules/classes/infrastructure/repositories/prisma-enrollment-repository.js'
import { PrismaSubjectRepository } from '../../modules/subjects/infrastructure/repositories/prisma-subject-repository.js'
import { PrismaExamRepository } from '../../modules/exams/infrastructure/repositories/prisma-exam-repository.js'
import { PrismaSettingsRepository } from '../../modules/settings/infrastructure/repositories/prisma-settings-repository.js'
import { ISubmissionRepository } from '../../modules/submissions/domain/repositories/submission-repository.interface.js'
import { PrismaSubmissionRepository } from '../../modules/submissions/infrastructure/repositories/prisma-submission-repository.js'
import { logger } from './logger.js'

export class PrismaUnitOfWork implements IUnitOfWork {
  private client: PrismaClient | Prisma.TransactionClient
  private repositories: Map<string, any> = new Map()

  constructor(client: PrismaClient | Prisma.TransactionClient = prisma) {
    this.client = client
  }

  /**
   * Dynamically resolves a repository or returns a cached instance.
   */
  public getRepo<T>(RepoClass: new (client: any) => T): T {
    const className = RepoClass.name
    if (!this.repositories.has(className)) {
      this.repositories.set(className, new RepoClass(this.client))
    }
    return this.repositories.get(className) as T
  }

  // legacy getters for backward compatibility (can be removed later)
  get userRepository(): IUserRepository { return this.getRepo(PrismaUserRepository) }
  get activityRepository(): IActivityRepository { return this.getRepo(PrismaActivityRepository) }
  get classRepository(): IClassRepository { return this.getRepo(PrismaClassRepository) }
  get enrollmentRepository(): IEnrollmentRepository { return this.getRepo(PrismaEnrollmentRepository) }
  get subjectRepository(): ISubjectRepository { return this.getRepo(PrismaSubjectRepository) }
  get examRepository(): IExamRepository { return this.getRepo(PrismaExamRepository) }
  get submissionRepository(): ISubmissionRepository { return this.getRepo(PrismaSubmissionRepository) }
  get settingsRepository(): ISettingsRepository { return this.getRepo(PrismaSettingsRepository) }

  async runInTransaction<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    if (this.isTransactionClient(this.client)) {
      logger.debug('Reusing existing transaction')
      return work(this)
    }

    logger.debug('Starting new transaction')
    const timeout = Number(process.env.DB_TRANSACTION_TIMEOUT) || 10000

    try {
      const result = await (this.client as PrismaClient).$transaction(
        async (tx) => {
          const txUow = new PrismaUnitOfWork(tx)
          return work(txUow)
        },
        { timeout }
      )
      logger.debug('Transaction committed successfully')
      return result
    } catch (error) {
      logger.error('Transaction rolled back due to error', { error })
      throw error
    }
  }

  private isTransactionClient(client: PrismaClient | Prisma.TransactionClient): boolean {
    return !('$transaction' in client) || typeof (client as any).$transaction !== 'function'
  }
}
export const unitOfWork = new PrismaUnitOfWork()
