import { Router } from 'express'
import { AuthRouter } from '../../modules/auth/presentation/auth.router.js'
import { ClassesRouter } from '../../modules/classes/presentation/classes.router.js'
import { SubjectsRouter } from '../../modules/subjects/presentation/subjects.router.js'
import { container } from '../infrastructure/di-container.js'
import { authenticate, requireRoles } from '../../middleware/auth.js'
import { asyncHandler } from '../../utils/async-handler.js'

/**
 * ApiRouteManager — centrally manages all API routes.
 *
 * ┌─────────────────────┐
 * │  Clean Architecture │  /auth/*, /classes/*, /subjects/*
 * ├─────────────────────┤
 * │  Legacy (wrapped)   │  /submissions, ...
 * └─────────────────────┘
 */
export class ApiRouteManager {
  private readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    // ── Health Check ──────────────────────────────────────────────
    this.router.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // ── Clean Architecture Modules ───────────────────────────────
    this.router.use('/auth', new AuthRouter().router)
    this.router.use('/classes', new ClassesRouter().router)
    this.router.use('/subjects', new SubjectsRouter().router)

    // ── Legacy routes (via DI container) ─────────────────────────
    this.registerAssignmentRoutes()
    this.registerUserRoutes()
    this.registerSubmissionRoutes()
    this.registerNotificationRoutes()
    this.registerStatsRoutes()
    this.registerReportRoutes()
    this.registerSettingsRoutes()
    this.registerOptionsRoutes()
    this.registerAiRoutes()
  }

  // ── Assignments ───────────────────────────────────────────────
  private registerAssignmentRoutes() {
    const ctrl = container.get<any>('AssignmentController')
    this.router.get('/assignments', asyncHandler(ctrl.list))
    this.router.post('/assignments', authenticate, asyncHandler(ctrl.create))
    this.router.put('/assignments/:id', authenticate, asyncHandler(ctrl.update))
    this.router.delete('/assignments/:id', authenticate, asyncHandler(ctrl.delete))
  }

  // ── Users (Admin) ─────────────────────────────────────────────
  private registerUserRoutes() {
    const ctrl = container.get<any>('UsersController')
    this.router.get('/users', authenticate, asyncHandler((req: any, res: any) => ctrl.list(req, res)))
    this.router.post('/users', authenticate, asyncHandler((req: any, res: any) => ctrl.create(req, res)))
    this.router.patch('/users/:id', authenticate, asyncHandler((req: any, res: any) => ctrl.update(req, res)))
    this.router.delete('/users/:id', authenticate, asyncHandler((req: any, res: any) => ctrl.delete(req, res)))
    this.router.patch('/users/:id/lock', authenticate, asyncHandler((req: any, res: any) => ctrl.toggleLock(req, res)))
  }

  // ── Submissions ───────────────────────────────────────────────
  private registerSubmissionRoutes() {
    const ctrl = container.get<any>('SubmissionController')
    this.router.get('/submissions', authenticate, asyncHandler(ctrl.list))
    this.router.get('/submissions/recent', authenticate, asyncHandler(ctrl.recent))
    this.router.get('/submissions/:id', authenticate, asyncHandler(ctrl.getOne))
    this.router.post('/submissions', authenticate, asyncHandler(ctrl.submit))
    this.router.patch('/submissions/:id/grade', authenticate, asyncHandler(ctrl.publishGrade))
  }

  // ── Notifications ─────────────────────────────────────────────
  private registerNotificationRoutes() {
    const ctrl = container.get<any>('NotificationController')
    this.router.get('/notifications', authenticate, asyncHandler(ctrl.list))
    this.router.post('/notifications', authenticate, asyncHandler(ctrl.create))
    this.router.patch('/notifications/:id/read', authenticate, asyncHandler(ctrl.markRead))
  }

  // ── Stats / Dashboard ─────────────────────────────────────────
  private registerStatsRoutes() {
    const ctrl = container.get<any>('StatsController')
    this.router.get('/stats/overview', authenticate, asyncHandler(ctrl.overview))
    this.router.get('/stats/activity-logs', authenticate, requireRoles('ADMIN'), asyncHandler(ctrl.activityLogs))
    this.router.get('/stats/student-history', authenticate, asyncHandler(ctrl.studentHistory))
    this.router.get('/stats/teamwork', authenticate, asyncHandler(ctrl.teamwork))
    this.router.get('/stats/student-teamwork', authenticate, asyncHandler(ctrl.studentTeamwork))
    this.router.get('/stats/lecturer-report', authenticate, asyncHandler(ctrl.lecturerReport))
    this.router.get('/stats/student-progress', authenticate, asyncHandler(ctrl.studentProgress))
    this.router.get('/stats/student-feedback', authenticate, asyncHandler(ctrl.studentFeedbackList))
    this.router.get('/stats/student-learning', authenticate, asyncHandler(ctrl.studentLearning))
  }

  // ── Reports ───────────────────────────────────────────────────
  private registerReportRoutes() {
    const ctrl = container.get<any>('ReportController')
    this.router.get('/reports', authenticate, requireRoles('ADMIN'), asyncHandler(ctrl.adminReport))
    this.router.get('/reports/health', authenticate, requireRoles('ADMIN'), asyncHandler(ctrl.systemHealth))
  }

  // ── Settings ──────────────────────────────────────────────────
  private registerSettingsRoutes() {
    const ctrl = container.get<any>('SettingsController')
    this.router.get('/settings', authenticate, requireRoles('ADMIN'), asyncHandler(ctrl.getAll))
    this.router.put('/settings', authenticate, requireRoles('ADMIN'), asyncHandler(ctrl.update))
  }

  // ── Options (dropdown data) ───────────────────────────────────
  private registerOptionsRoutes() {
    const ctrl = container.get<any>('OptionsController')
    this.router.get('/options/classes', authenticate, asyncHandler(ctrl.classOptions))
    this.router.get('/options/assignments', authenticate, asyncHandler(ctrl.assignmentOptions))
    this.router.get('/options/lecturers', authenticate, asyncHandler(ctrl.lecturerOptions))
  }

  // ── AI ────────────────────────────────────────────────────────
  private registerAiRoutes() {
    const ctrl = container.get<any>('AiController')
    this.router.post('/ai/generate-exercise', authenticate, asyncHandler(ctrl.generateExercise))
    this.router.post('/ai/save-assignment', authenticate, asyncHandler(ctrl.saveAssignmentFromAI))
    this.router.post('/ai/assess/:submissionId', authenticate, asyncHandler(ctrl.assessSubmission))
    this.router.get('/ai/feedback/:studentId', authenticate, asyncHandler(ctrl.learningFeedback))
    this.router.get('/ai/reviews', authenticate, asyncHandler(ctrl.listReviews))
    this.router.post('/ai/reviews/:jobId', authenticate, asyncHandler(ctrl.reviewJob))
    this.router.get('/ai/config', authenticate, requireRoles('ADMIN'), asyncHandler(ctrl.getConfig))
    this.router.put('/ai/config', authenticate, requireRoles('ADMIN'), asyncHandler(ctrl.updateConfig))
  }

  /**
   * Return the configured router instance.
   */
  getRouter(): Router {
    return this.router
  }
}

export const routeManager = new ApiRouteManager()
