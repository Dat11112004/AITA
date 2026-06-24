import { Router } from 'express'
import { AuthRouter } from '../../modules/auth/presentation/auth.router.js'
import { ClassesRouter } from '../../modules/classes/presentation/classes.router.js'
import { SubjectsRouter } from '../../modules/subjects/presentation/subjects.router.js'
import { AssignmentsRouter } from '../../modules/assignments/presentation/assignments.router.js'
import { SubmissionsRouter } from '../../modules/submissions/presentation/submissions.router.js'
import { UsersRouter } from '../../modules/users/presentation/users.router.js'
import { AiRouter } from '../../modules/ai/presentation/ai.router.js'
import { ReportsRouter } from '../../modules/reports/presentation/reports.router.js'
import { AuditRouter } from '../../modules/audit/presentation/audit.router.js'
import { ConfigRouter } from '../../modules/config/presentation/config.router.js'
import { NotificationsRouter } from '../../modules/notifications/presentation/notifications.router.js'
import { RubricRouter } from '../../modules/rubric/presentation/rubric.router.js'
import { GradingRouter } from '../../modules/grading/presentation/grading.router.js'
import { StatsRouter } from '../../modules/stats/presentation/stats.router.js'
import { SettingsRouter } from '../../modules/settings/presentation/settings.router.js'
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
    this.router.use('/assignments', new AssignmentsRouter().router)
    this.router.use('/submissions', new SubmissionsRouter().router)
    this.router.use('/users', new UsersRouter().router)
    this.router.use('/ai', new AiRouter().router)
    this.router.use('/reports', new ReportsRouter().router)
    this.router.use('/audit', new AuditRouter().router)
    this.router.use('/config', new ConfigRouter().router)
    this.router.use('/notifications', new NotificationsRouter().router)
    this.router.use('/rubric', new RubricRouter().router)
    this.router.use('/grading', new GradingRouter().router)
    this.router.use('/stats', new StatsRouter().router)
    this.router.use('/settings', new SettingsRouter().router)

    // ── Legacy routes (via DI container) ─────────────────────────
    this.registerStatsRoutes()
    // this.registerReportRoutes() -> REMOVED

    this.registerSettingsRoutes()
    this.registerOptionsRoutes()
    // this.registerAiRoutes() -> REMOVED
  }

  // ── Assignments ───────────────────────────────────────────────
  // ── Users (Admin) ─────────────────────────────────────────────

  // ── Notifications ─────────────────────────────────────────────


  // ── Notifications ─────────────────────────────────────────────

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

  // ── Reports - Migrated to modular version above


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

  // ── AI - Migrated to modular version above


  /**
   * Return the configured router instance.
   */
  getRouter(): Router {
    return this.router
  }
}

export const routeManager = new ApiRouteManager()
