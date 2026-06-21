import { logger } from './logger.js'

// Legacy controllers (functions)
import { login, registerStudent, me } from '../../controllers/auth.controller.js'
import { list as listClasses, create as createClass } from '../../controllers/classes.controller.js'
import { list as listAssignments, create as createAssignment, update as updateAssignment } from '../../controllers/assignments.controller.js'
import { UsersController } from '../../controllers/users.controller.js'

/**
 * DI Container — wraps legacy services/controllers for backward compatibility.
 * The legacy layer uses singleton services and function-based controllers.
 * This container provides a unified interface for route handlers.
 */
export class DIContainer {
  private static instance: DIContainer
  private services: Map<string, any> = new Map()

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
      // Auth — wrap legacy functions as controller methods
      this.services.set('AuthController', {
        login: async (req: any, res: any) => {
          try { await login(req, res) } catch (e) { this.handleError(e, res) }
        },
        register: async (req: any, res: any) => {
          try { await registerStudent(req, res) } catch (e) { this.handleError(e, res) }
        },
        getMe: async (req: any, res: any) => {
          try { await me(req, res) } catch (e) { this.handleError(e, res) }
        },
      })

      // Classes — wrap legacy functions as controller methods
      this.services.set('ClassController', {
        list: async (req: any, res: any) => {
          try { await listClasses(req, res) } catch (e) { this.handleError(e, res) }
        },
        create: async (req: any, res: any) => {
          try { await createClass(req, res) } catch (e) { this.handleError(e, res) }
        },
        update: async (_req: any, res: any) => {
          const { ok } = await import('../../utils/response.js')
          ok(res, { message: 'Not implemented' })
        },
        delete: async (_req: any, res: any) => {
          const { ok } = await import('../../utils/response.js')
          ok(res, { message: 'Not implemented' })
        },
      })

      // Assignments — wrap legacy functions as controller methods
      this.services.set('AssignmentController', {
        list: async (req: any, res: any) => {
          try { await listAssignments(req, res) } catch (e) { this.handleError(e, res) }
        },
        create: async (req: any, res: any) => {
          try { await createAssignment(req, res) } catch (e) { this.handleError(e, res) }
        },
        update: async (req: any, res: any) => {
          try { await updateAssignment(req, res) } catch (e) { this.handleError(e, res) }
        },
        delete: async (_req: any, res: any) => {
          const { ok } = await import('../../utils/response.js')
          ok(res, { message: 'Not implemented' })
        },
      })

      // Users — already a class
      this.services.set('UsersController', new UsersController())

      logger.info('DI Container initialized successfully with legacy services')
    } catch (error) {
      logger.error('DI Container initialization failed', error as Error)
      throw error
    }
  }

  private handleError(error: unknown, res: any) {
    if (error instanceof Error) {
      const statusCode = (error as any).statusCode ?? 500
      res.status(statusCode).json({ success: false, message: error.message })
    } else {
      res.status(500).json({ success: false, message: 'Internal server error' })
    }
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`)
    }
    return service
  }
}

export const container = DIContainer.getInstance()
