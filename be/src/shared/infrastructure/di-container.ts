import { logger } from './logger.js'

// Clean Architecture components
import { PrismaUnitOfWork } from './prisma-unit-of-work.js'
import { LoginUseCase } from '../../modules/auth/application/use-cases/login.use-case.js'
import { RegisterStudentUseCase } from '../../modules/auth/application/use-cases/register.use-case.js'
import { GetMeUseCase } from '../../modules/auth/application/use-cases/get-me.use-case.js'
import { AuthController } from '../../modules/auth/presentation/auth.controller.js'
import { ListClassesUseCase } from '../../modules/classes/application/use-cases/list-classes.use-case.js'
import { CreateClassUseCase } from '../../modules/classes/application/use-cases/create-class.use-case.js'
import { GetClassStudentsUseCase } from '../../modules/classes/application/use-cases/get-class-students.use-case.js'
import { EnrollStudentUseCase } from '../../modules/classes/application/use-cases/enroll-student.use-case.js'
import { ClassesController } from '../../modules/classes/presentation/classes.controller.js'
import { ListSubjectsUseCase } from '../../modules/subjects/application/use-cases/list-subjects.use-case.js'
import { CreateSubjectUseCase } from '../../modules/subjects/application/use-cases/create-subject.use-case.js'
import { UpdateSubjectUseCase } from '../../modules/subjects/application/use-cases/update-subject.use-case.js'
import { DeleteSubjectUseCase } from '../../modules/subjects/application/use-cases/delete-subject.use-case.js'
import { SubjectsController } from '../../modules/subjects/presentation/subjects.controller.js'
import { ListAssignmentsUseCase } from '../../modules/assignments/application/use-cases/list-assignments.use-case.js'
import { CreateAssignmentUseCase } from '../../modules/assignments/application/use-cases/create-assignment.use-case.js'
import { UpdateAssignmentUseCase } from '../../modules/assignments/application/use-cases/update-assignment.use-case.js'
import { GetAssignmentUseCase } from '../../modules/assignments/application/use-cases/get-assignment.use-case.js'
import { AssignmentsController } from '../../modules/assignments/presentation/assignments.controller.js'
import { ListSubmissionsUseCase } from '../../modules/submissions/application/use-cases/list-submissions.use-case.js'
import { CreateSubmissionUseCase } from '../../modules/submissions/application/use-cases/create-submission.use-case.js'
import { GetSubmissionUseCase } from '../../modules/submissions/application/use-cases/get-submission.use-case.js'
import { PublishGradeUseCase } from '../../modules/submissions/application/use-cases/publish-grade.use-case.js'
import { RecentSubmissionsUseCase } from '../../modules/submissions/application/use-cases/recent-submissions.use-case.js'
import { SubmissionsController } from '../../modules/submissions/presentation/submissions.controller.js'
import { ListUsersUseCase } from '../../modules/users/application/use-cases/list-users.use-case.js'
import { CreateUserUseCase } from '../../modules/users/application/use-cases/create-user.use-case.js'
import { UpdateUserUseCase } from '../../modules/users/application/use-cases/update-user.use-case.js'
import { DeleteUserUseCase } from '../../modules/users/application/use-cases/delete-user.use-case.js'
import { ToggleLockUseCase } from '../../modules/users/application/use-cases/toggle-lock.use-case.js'
import { UsersController as ModularUsersController } from '../../modules/users/presentation/users.controller.js'
import { ExternalAiService } from '../../modules/ai/infrastructure/external-ai.service.js'
import { GenerateExerciseUseCase } from '../../modules/ai/application/use-cases/generate-exercise.use-case.js'
import { SaveAiAssignmentUseCase } from '../../modules/ai/application/use-cases/save-ai-assignment.use-case.js'
import { AssessSubmissionUseCase } from '../../modules/ai/application/use-cases/assess-submission.use-case.js'
import { GetLearningFeedbackUseCase } from '../../modules/ai/application/use-cases/get-learning-feedback.use-case.js'
import { GetAiConfigUseCase, UpdateAiConfigUseCase } from '../../modules/ai/application/use-cases/ai-config.use-case.js'
import { AiController as ModularAiController } from '../../modules/ai/presentation/ai.controller.js'
import { PrismaAuditRepository } from '../../modules/audit/infrastructure/repositories/prisma-audit-repository.js'
import { GetAuditLogsUseCase } from '../../modules/audit/application/use-cases/get-audit-logs.use-case.js'
import { GetAiUsageLogsUseCase } from '../../modules/audit/application/use-cases/get-ai-usage-logs.use-case.js'
import { AuditController as ModularAuditController } from '../../modules/audit/presentation/audit.controller.js'
import { PrismaConfigRepository } from '../../modules/config/infrastructure/repositories/prisma-config-repository.js'
import { ListProjectTypesUseCase, GetProjectTypeUseCase, UpdateProjectTypeUseCase } from '../../modules/config/application/use-cases/config.use-case.js'
import { ConfigController as ModularConfigController } from '../../modules/config/presentation/config.controller.js'
import { PrismaNotificationRepository } from '../../modules/notifications/infrastructure/repositories/prisma-notification-repository.js'
import { ListUserNotificationsUseCase, MarkNotificationAsReadUseCase } from '../../modules/notifications/application/use-cases/notification.use-case.js'
import { NotificationsController as ModularNotificationsController } from '../../modules/notifications/presentation/notifications.controller.js'
import { PrismaRubricRepository } from '../../modules/rubric/infrastructure/repositories/prisma-rubric-repository.js'
import { ListRubricRulesUseCase, GetRubricRuleWithCriteriaUseCase } from '../../modules/rubric/application/use-cases/rubric.use-case.js'
import { RubricController as ModularRubricController } from '../../modules/rubric/presentation/rubric.controller.js'
import { PrismaGradingRepository } from '../../modules/grading/infrastructure/repositories/prisma-grading-repository.js'
import { GetGradingSessionStatusUseCase, StartGradingSessionUseCase } from '../../modules/grading/application/use-cases/grading.use-case.js'
import { GradingController as ModularGradingController } from '../../modules/grading/presentation/grading.controller.js'
import { PrismaStatsRepository } from '../../modules/stats/infrastructure/repositories/prisma-stats-repository.js'
import { GetOverviewUseCase, GetActivityLogsUseCase, GetLecturerReportUseCase, GetStudentProgressUseCase, GetStudentHistoryUseCase } from '../../modules/stats/application/use-cases/stats.use-case.js'
import { StatsController as ModularStatsController } from '../../modules/stats/presentation/stats.controller.js'
import { PrismaReportsRepository } from '../../modules/reports/infrastructure/repositories/prisma-reports-repository.js'
import { GetAdminReportUseCase, GetSystemHealthUseCase } from '../../modules/reports/application/use-cases/reports.use-case.js'
import { ReportsController as ModularReportsController } from '../../modules/reports/presentation/reports.controller.js'
import { PrismaAiRepository } from '../../modules/ai/infrastructure/repositories/prisma-ai-repository.js'
import { GetSystemConfigUseCase, UpdateSystemConfigUseCase, GetOptionsUseCase } from '../../modules/settings/application/use-cases/settings.use-case.js'
import { PrismaSettingsRepository } from '../../modules/settings/infrastructure/repositories/prisma-settings-repository.js'
import { SettingsController as ModularSettingsController } from '../../modules/settings/presentation/settings.controller.js'

// Legacy controllers (functions)
// import { list as listNotifications, create as createNotification, markRead as markNotificationRead } from '../../controllers/notifications.controller.js'
// import * as statsController from '../../controllers/stats.controller.js' // REMOVED
// import * as settingsController from '../../controllers/settings.controller.js' // REMOVED
// import * as optionsController from '../../controllers/options.controller.js' // REMOVED

/**
 * DI Container — wraps legacy services/controllers for backward compatibility.
 * The legacy layer uses singleton services and function-based controllers.
 * This container provides a unified interface for route handlers.
 */
export class DIContainer {
  private static instance: DIContainer
  private services: Map<string, unknown> = new Map()

  private constructor() {
    this.registerDependencies()
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer()
    }
    return DIContainer.instance
  }

  private registerDependencies() {
    try {
      // ── Clean Architecture ──────────────────────────────────────
      const uow = new PrismaUnitOfWork()
      this.services.set('UnitOfWork', uow)

      const loginUseCase = new LoginUseCase(uow)
      const registerStudentUseCase = new RegisterStudentUseCase(uow)
      const getMeUseCase = new GetMeUseCase(uow)

      const authController = new AuthController(loginUseCase, registerStudentUseCase, getMeUseCase)
      this.services.set('AuthController', authController)

      // ── Classes ───────────────────────────────────────────────
      const listClassesUseCase = new ListClassesUseCase(uow)
      const createClassUseCase = new CreateClassUseCase(uow)
      const getClassStudentsUseCase = new GetClassStudentsUseCase(uow)
      const enrollStudentUseCase = new EnrollStudentUseCase(uow)

      const classController = new ClassesController(
        listClassesUseCase,
        createClassUseCase,
        getClassStudentsUseCase,
        enrollStudentUseCase
      )
      this.services.set('ClassController', classController)

      // ── Subjects ──────────────────────────────────────────────
      const listSubjectsUseCase = new ListSubjectsUseCase(uow)
      const createSubjectUseCase = new CreateSubjectUseCase(uow)
      const updateSubjectUseCase = new UpdateSubjectUseCase(uow)
      const deleteSubjectUseCase = new DeleteSubjectUseCase(uow)

      const subjectController = new SubjectsController(
        listSubjectsUseCase,
        createSubjectUseCase,
        updateSubjectUseCase,
        deleteSubjectUseCase
      )
      this.services.set('SubjectController', subjectController)

      // ── Assignments ──────────────────────────────────────────
      const listAssignmentsUseCase = new ListAssignmentsUseCase(uow)
      const createAssignmentUseCase = new CreateAssignmentUseCase(uow)
      const updateAssignmentUseCase = new UpdateAssignmentUseCase(uow)
      const getAssignmentUseCase = new GetAssignmentUseCase(uow)

      const assignmentsController = new AssignmentsController(
        listAssignmentsUseCase,
        createAssignmentUseCase,
        updateAssignmentUseCase,
        getAssignmentUseCase
      )
      this.services.set('AssignmentsController', assignmentsController)

      // ── Submissions ──────────────────────────────────────────
      const listSubmissionsUseCase = new ListSubmissionsUseCase(uow)
      const submitSubmissionUseCase = new CreateSubmissionUseCase(uow)
      const getSubmissionUseCase = new GetSubmissionUseCase(uow)
      const publishGradeUseCase = new PublishGradeUseCase(uow)
      const recentSubmissionsUseCase = new RecentSubmissionsUseCase(uow)

      const submissionController = new SubmissionsController(
        listSubmissionsUseCase,
        recentSubmissionsUseCase,
        getSubmissionUseCase,
        submitSubmissionUseCase,
        publishGradeUseCase
      )
      this.services.set('SubmissionController', submissionController)

      // ── Users ────────────────────────────────────────────────
      const listUsersUseCase = new ListUsersUseCase(uow)
      const createUserUseCase = new CreateUserUseCase(uow)
      const updateUserUseCase = new UpdateUserUseCase(uow)
      const deleteUserUseCase = new DeleteUserUseCase(uow)
      const toggleLockUseCase = new ToggleLockUseCase(uow)

      const modularUsersController = new ModularUsersController(
        listUsersUseCase,
        createUserUseCase,
        updateUserUseCase,
        deleteUserUseCase,
        toggleLockUseCase
      )
      this.services.set('UsersController', modularUsersController)

      // ── AI ───────────────────────────────────────────────────
      const aiService = new ExternalAiService()
      const aiRepo = new PrismaAiRepository(uow as any)
      const generateExerciseUseCase = new GenerateExerciseUseCase(aiService, aiRepo)
      const saveAiAssignmentUseCase = new SaveAiAssignmentUseCase(uow)
      const assessSubmissionUseCase = new AssessSubmissionUseCase(uow, aiService, aiRepo)
      const getLearningFeedbackUseCase = new GetLearningFeedbackUseCase(aiService, aiRepo)
      const getAiConfigUseCase = new GetAiConfigUseCase(uow)
      const updateAiConfigUseCase = new UpdateAiConfigUseCase(uow)

      const modularAiController = new ModularAiController(
        generateExerciseUseCase,
        saveAiAssignmentUseCase,
        assessSubmissionUseCase,
        getLearningFeedbackUseCase,
        getAiConfigUseCase,
        updateAiConfigUseCase
      )
      this.services.set('AiController', modularAiController)

      // ── Reports ─────────────────────────────────────────────
      const reportsRepo = new PrismaReportsRepository(uow as any)
      const getAdminReportUseCase = new GetAdminReportUseCase(reportsRepo)
      const getSystemHealthUseCase = new GetSystemHealthUseCase()

      const modularReportsController = new ModularReportsController(getAdminReportUseCase, getSystemHealthUseCase)
      this.services.set('ReportsController', modularReportsController)

      // ── Audit ────────────────────────────────────────────────
      const auditRepo = new PrismaAuditRepository(uow as any)
      const getAuditLogsUseCase = new GetAuditLogsUseCase(auditRepo)
      const getAiUsageLogsUseCase = new GetAiUsageLogsUseCase(auditRepo)

      const modularAuditController = new ModularAuditController(
        getAuditLogsUseCase,
        getAiUsageLogsUseCase
      )
      this.services.set('AuditController', modularAuditController)

      // ── Config ───────────────────────────────────────────────
      const configRepo = new PrismaConfigRepository(uow as any)
      const listProjectTypesUseCase = new ListProjectTypesUseCase(configRepo)
      const getProjectTypeUseCase = new GetProjectTypeUseCase(configRepo)
      const updateProjectTypeUseCase = new UpdateProjectTypeUseCase(configRepo)

      const modularConfigController = new ModularConfigController(
        listProjectTypesUseCase,
        getProjectTypeUseCase,
        updateProjectTypeUseCase
      )
      this.services.set('ConfigController', modularConfigController)

      // ── Notifications ────────────────────────────────────────
      const notificationRepo = new PrismaNotificationRepository(uow as any)
      const listNotificationsUseCase = new ListUserNotificationsUseCase(notificationRepo)
      const markNotificationAsReadUseCase = new MarkNotificationAsReadUseCase(notificationRepo)

      const modularNotificationsController = new ModularNotificationsController(
        listNotificationsUseCase,
        markNotificationAsReadUseCase
      )
      this.services.set('NotificationsController', modularNotificationsController)

      // ── Rubric ───────────────────────────────────────────────
      const rubricRepo = new PrismaRubricRepository(uow as any)
      const listRubricRulesUseCase = new ListRubricRulesUseCase(rubricRepo)
      const getRubricRuleWithCriteriaUseCase = new GetRubricRuleWithCriteriaUseCase(rubricRepo)

      const modularRubricController = new ModularRubricController(
        listRubricRulesUseCase,
        getRubricRuleWithCriteriaUseCase
      )
      this.services.set('RubricController', modularRubricController)

      // ── Grading ──────────────────────────────────────────────
      const gradingRepo = new PrismaGradingRepository(uow as any)
      const getGradingSessionStatusUseCase = new GetGradingSessionStatusUseCase(gradingRepo)
      const startGradingSessionUseCase = new StartGradingSessionUseCase(gradingRepo)

      const modularGradingController = new ModularGradingController(
        getGradingSessionStatusUseCase,
        startGradingSessionUseCase
      )
      this.services.set('GradingController', modularGradingController)

      // ── Stats ────────────────────────────────────────────────
      const statsRepo = new PrismaStatsRepository(uow as any)
      const getOverviewUseCase = new GetOverviewUseCase(statsRepo)
      const getActivityLogsUseCase = new GetActivityLogsUseCase(statsRepo)
      const getLecturerReportUseCase = new GetLecturerReportUseCase(statsRepo)
      const getStudentProgressUseCase = new GetStudentProgressUseCase(statsRepo)
      const getStudentHistoryUseCase = new GetStudentHistoryUseCase(statsRepo)

      const modularStatsController = new ModularStatsController(
        getOverviewUseCase,
        getActivityLogsUseCase,
        getLecturerReportUseCase,
        getStudentProgressUseCase,
        getStudentHistoryUseCase
      )
      this.services.set('StatsController', modularStatsController)

      // ── Settings ─────────────────────────────────────────────
      const settingsRepo = new PrismaSettingsRepository(uow as any)
      const getSystemConfigUseCase = new GetSystemConfigUseCase(settingsRepo)
      const updateSystemConfigUseCase = new UpdateSystemConfigUseCase(settingsRepo)
      const getOptionsUseCase = new GetOptionsUseCase(settingsRepo)

      const modularSettingsController = new ModularSettingsController(
        getSystemConfigUseCase,
        updateSystemConfigUseCase,
        getOptionsUseCase
      )
      this.services.set('SettingsController', modularSettingsController)
      this.services.set('OptionsController', modularSettingsController)

      // Legacy: Assignments - Migrated to Clean Architecture


      // Legacy: Users - Migrated to modular version above


      // ── Legacy: Submissions ─────────────────────────────────────
      // Moved to Clean Architecture above


      // All Legacy controllers migrated to modular versions

      // Legacy Stats, Settings, Reports, AI, Options - ALL REMOVED/MIGRATED

      // Legacy: AI - Migrated to modular version above


      logger.info('DI Container initialized successfully with Clean Architecture and legacy services')
    } catch (error) {
      logger.error('DI Container initialization failed', error as Error)
      throw error
    }
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`)
    }
    return service as T
  }
}

export const container = DIContainer.getInstance()
