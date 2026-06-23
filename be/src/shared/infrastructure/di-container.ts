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

// Legacy controllers (functions)
import { list as listAssignments, create as createAssignment, update as updateAssignment } from '../../controllers/assignments.controller.js'
import { UsersController } from '../../controllers/users.controller.js'
import { list as listSubmissions, recent as recentSubmissions, getOne as getOneSubmission, submit as submitSubmission, publishGrade } from '../../controllers/submissions.controller.js'
import { list as listNotifications, create as createNotification, markRead as markNotificationRead } from '../../controllers/notifications.controller.js'
import * as statsController from '../../controllers/stats.controller.js'
import * as reportsController from '../../controllers/reports.controller.js'
import * as settingsController from '../../controllers/settings.controller.js'
import * as optionsController from '../../controllers/options.controller.js'
import * as aiController from '../../controllers/ai.controller.js'

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

      // Legacy: Assignments ─────────────────────────────────────


      this.services.set('AssignmentController', {
        list: this.wrap(listAssignments),
        create: this.wrap(createAssignment),
        update: this.wrap(updateAssignment),
        delete: this.notImplemented(),
      })

      // ── Legacy: Users (class-based) ─────────────────────────────
      this.services.set('UsersController', new UsersController())

      this.services.set('UserController', new UsersController())

      // ── Legacy: Submissions ─────────────────────────────────────
      this.services.set('SubmissionController', {
        list: this.wrap(listSubmissions),
        recent: this.wrap(recentSubmissions),
        getOne: this.wrap(getOneSubmission),
        submit: this.wrap(submitSubmission),
        publishGrade: this.wrap(publishGrade),
      })

      // ── Legacy: Notifications ───────────────────────────────────
      this.services.set('NotificationController', {
        list: this.wrap(listNotifications),
        create: this.wrap(createNotification),
        markRead: this.wrap(markNotificationRead),
      })

      // ── Legacy: Stats ───────────────────────────────────────────
      this.services.set('StatsController', {
        overview: this.wrap(statsController.overview),
        activityLogs: this.wrap(statsController.activityLogs),
        studentHistory: this.wrap(statsController.studentHistory),
        teamwork: this.wrap(statsController.teamwork),
        studentTeamwork: this.wrap(statsController.studentTeamwork),
        lecturerReport: this.wrap(statsController.lecturerReport),
        studentProgress: this.wrap(statsController.studentProgress),
        studentFeedbackList: this.wrap(statsController.studentFeedbackList),
        studentLearning: this.wrap(statsController.studentLearning),
      })

      // ── Legacy: Reports ─────────────────────────────────────────
      this.services.set('ReportController', {
        adminReport: this.wrap(reportsController.adminReport),
        systemHealth: this.wrap(reportsController.systemHealth),
      })

      // ── Legacy: Settings ────────────────────────────────────────
      this.services.set('SettingsController', {
        getAll: this.wrap(settingsController.getAll),
        update: this.wrap(settingsController.update),
      })

      // ── Legacy: Options (dropdown data) ─────────────────────────
      this.services.set('OptionsController', {
        classOptions: this.wrap(optionsController.classOptions),
        assignmentOptions: this.wrap(optionsController.assignmentOptions),
        lecturerOptions: this.wrap(optionsController.lecturerOptions),
      })

      // ── Legacy: AI ──────────────────────────────────────────────
      this.services.set('AiController', {
        generateExercise: this.wrap(aiController.generateExercise),
        saveAssignmentFromAI: this.wrap(aiController.saveAssignmentFromAI),
        assessSubmission: this.wrap(aiController.assessSubmission),
        learningFeedback: this.wrap(aiController.learningFeedback),
        listReviews: this.wrap(aiController.listReviews),
        reviewJob: this.wrap(aiController.reviewJob),
        getConfig: this.wrap(aiController.getConfig),
        updateConfig: this.wrap(aiController.updateConfig),
      })

      logger.info('DI Container initialized successfully with Clean Architecture and legacy services')
    } catch (error) {
      logger.error('DI Container initialization failed', error as Error)
      throw error
    }
  }

  /**
   * Wraps a legacy controller function to catch errors and forward them properly.
   */
  private wrap(fn: Function) {
    return async (req: any, res: any, next: any) => {
      try { await fn(req, res) } catch (e) { next(e) }
    }
  }

  /**
   * Returns a stub handler for unimplemented endpoints.
   */
  private notImplemented() {
    return async (_req: any, res: any) => {
      res.status(501).json({ statusCode: 501, Message: 'Not implemented' })
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
