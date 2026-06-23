import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma.js'
import { IUnitOfWork } from '../application/ports/unit-of-work.interface.js'
import { IUserRepository } from '../../modules/auth/domain/repositories/user-repository.interface.js'
import { IActivityRepository } from '../../modules/auth/domain/repositories/activity-repository.interface.js'
import { IClassRepository } from '../../modules/classes/domain/repositories/class-repository.interface.js'
import { IEnrollmentRepository } from '../../modules/classes/domain/repositories/enrollment-repository.interface.js'
import { ISubjectRepository } from '../../modules/subjects/domain/repositories/subject-repository.interface.js'
import { IExamRepository } from '../../modules/exams/domain/repositories/exam-repository.interface.js'
import { PrismaUserRepository } from '../../modules/auth/infrastructure/repositories/prisma-user-repository.js'
import { PrismaActivityRepository } from '../../modules/auth/infrastructure/repositories/prisma-activity-repository.js'
import { PrismaClassRepository } from '../../modules/classes/infrastructure/repositories/prisma-class-repository.js'
import { PrismaEnrollmentRepository } from '../../modules/classes/infrastructure/repositories/prisma-enrollment-repository.js'
import { PrismaSubjectRepository } from '../../modules/subjects/infrastructure/repositories/prisma-subject-repository.js'
import { PrismaExamRepository } from '../../modules/exams/infrastructure/repositories/prisma-exam-repository.js'
import { logger } from './logger.js'

export class PrismaUnitOfWork implements IUnitOfWork {
  private client: PrismaClient | Prisma.TransactionClient
  private _userRepository?: IUserRepository
  private _activityRepository?: IActivityRepository
  private _classRepository?: IClassRepository
  private _enrollmentRepository?: IEnrollmentRepository
  private _subjectRepository?: ISubjectRepository
  private _examRepository?: IExamRepository

  constructor(client: PrismaClient | Prisma.TransactionClient = prisma) {
    this.client = client
  }

  get userRepository(): IUserRepository {
    if (!this._userRepository) {
      this._userRepository = new PrismaUserRepository(this.client)
    }
    return this._userRepository
  }

  get activityRepository(): IActivityRepository {
    if (!this._activityRepository) {
      this._activityRepository = new PrismaActivityRepository(this.client)
    }
    return this._activityRepository
  }

  get classRepository(): IClassRepository {
    if (!this._classRepository) {
      this._classRepository = new PrismaClassRepository(this.client)
    }
    return this._classRepository
  }

  get enrollmentRepository(): IEnrollmentRepository {
    if (!this._enrollmentRepository) {
      this._enrollmentRepository = new PrismaEnrollmentRepository(this.client)
    }
    return this._enrollmentRepository
  }

  get subjectRepository(): ISubjectRepository {
    if (!this._subjectRepository) {
      this._subjectRepository = new PrismaSubjectRepository(this.client)
    }
    return this._subjectRepository
  }

  get examRepository(): IExamRepository {
    if (!this._examRepository) {
      this._examRepository = new PrismaExamRepository(this.client)
    }
    return this._examRepository
  }

  async runInTransaction<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    // If the client is already inside a transaction, run work with this instance
    if (this.isTransactionClient(this.client)) {
      logger.debug('Reusing existing transaction')
      return work(this)
    }

    logger.debug('Starting new transaction')
    const timeout = Number(process.env.DB_TRANSACTION_TIMEOUT) || 10000

    try {
      // Otherwise, execute inside a new Prisma transaction
      const result = await (this.client as PrismaClient).$transaction(
        async (tx) => {
          const txUow = new PrismaUnitOfWork(tx)
          return work(txUow)
        },
        {
          timeout,
        }
      )
      logger.debug('Transaction committed successfully')
      return result
    } catch (error) {
      logger.error('Transaction rolled back due to error', { error })
      throw error
    }
  }

  private isTransactionClient(client: PrismaClient | Prisma.TransactionClient): boolean {
    return '$transaction' in client === false || typeof (client as any).$transaction !== 'function'
  }
}
export const unitOfWork = new PrismaUnitOfWork()
