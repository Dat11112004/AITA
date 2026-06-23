import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../shared/infrastructure/logger.js'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ]
    : ['error'],
})

if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  prisma.$on('query', (e: any) => {
    logger.debug(`[Prisma Query] ${e.query} -- Params: ${e.params} -- Duration: ${e.duration}ms`)
  })
}

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    logger.info('Database connection healthy')
    return true
  } catch (error) {
    logger.error('Database connection failed', error as Error)
    return false
  }
}

export { Prisma }

export type {
  User,
  Class,
  Submission,
  Subject,
  Notification,
  Exam,
  AssignmentTemplate,
  Semester,
  StudentClass,
  InstructorClass,
  UserRole,
  Role,
  AuditLog,
  SystemConfig,
  GradingSession,
  GradingJob,
  AiApiKey,
  AiUsageLog,
} from '@prisma/client'

export {
  UserStatus,
  AssignmentType,
  GradingStatus,
  ReviewStatus,
  ExamStatus,
  ExamType,
  JobStatus,
  AuditAction,
  BuildStatus,
  ExecutionStatus,
  SessionStatus,
  TriggerReason,
  ActionType,
  EngineType,
  SandboxStatus,
  ArtifactType,
  ValidationType,
  DependencyType,
  ReferenceArtifactType,
} from '@prisma/client'
