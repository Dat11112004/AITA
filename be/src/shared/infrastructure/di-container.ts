import { UserRepository } from '../../modules/auth/infrastructure/persistence/user.repository.js'
import { AuthDomainService } from '../../modules/auth/domain/services/auth.domain.service.js'
import { LoginUseCase } from '../../modules/auth/application/use-cases/login.use-case.js'
import { RegisterUseCase } from '../../modules/auth/application/use-cases/register.use-case.js'
import { GetMeUseCase } from '../../modules/auth/application/use-cases/get-me.use-case.js'
import { AuthController } from '../../modules/auth/presentation/controllers/auth.controller.js'

import { ClassRepository } from '../../modules/classes/infrastructure/persistence/class.repository.js'
import { ClassDomainService } from '../../modules/classes/domain/services/class.domain.service.js'
import { CreateClassUseCase } from '../../modules/classes/application/use-cases/create-class.use-case.js'
import { ListClassesUseCase } from '../../modules/classes/application/use-cases/list-classes.use-case.js'
import { UpdateClassUseCase } from '../../modules/classes/application/use-cases/update-class.use-case.js'
import { DeleteClassUseCase } from '../../modules/classes/application/use-cases/delete-class.use-case.js'
import { ClassController } from '../../modules/classes/presentation/controllers/class.controller.js'

import { signToken } from '../../middleware/auth.js'

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
    // Auth Module
    const userRepository = new UserRepository()
    this.services.set('UserRepository', userRepository)

    const authDomainService = new AuthDomainService()
    this.services.set('AuthDomainService', authDomainService)

    const loginUseCase = new LoginUseCase(
      userRepository,
      authDomainService,
      (payload: any) => signToken(payload)
    )
    this.services.set('LoginUseCase', loginUseCase)

    const registerUseCase = new RegisterUseCase(
      userRepository,
      authDomainService,
      (payload: any) => signToken(payload)
    )
    this.services.set('RegisterUseCase', registerUseCase)

    const getMeUseCase = new GetMeUseCase(userRepository)
    this.services.set('GetMeUseCase', getMeUseCase)

    const authController = new AuthController(
      loginUseCase,
      registerUseCase,
      getMeUseCase
    )
    this.services.set('AuthController', authController)

    // Classes Module
    const classRepository = new ClassRepository()
    this.services.set('ClassRepository', classRepository)

    const classDomainService = new ClassDomainService()
    this.services.set('ClassDomainService', classDomainService)

    const createClassUseCase = new CreateClassUseCase(classRepository, classDomainService)
    this.services.set('CreateClassUseCase', createClassUseCase)

    const listClassesUseCase = new ListClassesUseCase(classRepository)
    this.services.set('ListClassesUseCase', listClassesUseCase)

    const updateClassUseCase = new UpdateClassUseCase(classRepository)
    this.services.set('UpdateClassUseCase', updateClassUseCase)

    const deleteClassUseCase = new DeleteClassUseCase(classRepository)
    this.services.set('DeleteClassUseCase', deleteClassUseCase)

    const classController = new ClassController(
      createClassUseCase,
      listClassesUseCase,
      updateClassUseCase
    )
    this.services.set('ClassController', classController)
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
