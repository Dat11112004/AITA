import { PrismaClient, Prisma } from '@prisma/client'

export const prisma = new PrismaClient()
export { Prisma }

export type {
  User,
  Class,
  Assignment,
  Submission,
  Subject,
  Content,
  Notification,
  DiscussionThread,
  DiscussionReply,
  AIJob,
  SystemSetting,
  ActivityLog,
  ClassEnrollment
} from '@prisma/client'

export {
  UserRole,
  UserStatus,
  AssignmentType,
  AssignmentStatus,
  SubmissionStatus,
  AIJobType,
  AIJobStatus
} from '@prisma/client'
