import { PrismaClient, Prisma } from '@prisma/client'

export const prisma = new PrismaClient()
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
