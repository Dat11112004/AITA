---
name: aita-be-architecture
description: Use when adding or modifying an AITA backend feature — the modular Clean Architecture layers, the golden path to add a feature, mappers, BaseController, the DI container, and route-manager wiring.
---

# AITA BE — Modular Clean Architecture

Every feature is a module under `be/src/modules/<feature>/` with four layers. **Dependencies point inward**: `domain` (no framework) ← `application` (imports domain + shared/application) ← `infrastructure` (the only layer importing `@prisma/client`) ← `presentation`.

> The legacy flat layer (`be/src/controllers|services|repositories/`) was **deleted** in the Clean Architecture refactor. Everything live is `modules/*` + `shared/*`.

## Golden path — add a feature
1. `domain/entities/<x>.entity.ts` — domain entity with `create()`/`restore()` factories (no framework imports). `domain/repositories/<x>-repository.interface.ts` — `I`-prefixed interface whose methods take/return **domain entities**.
2. `application/dtos/<x>.dto.ts` — Zod schema + Request DTO (`static from()`) + Response DTO (`static from(entity)`). See `aita-be-validation-and-auth`.
3. `application/use-cases/<verb>-<noun>.use-case.ts` — one class implementing `IUseCase<TIn,TOut>`; constructor-injected **port interfaces** (`IUnitOfWork`, `ITokenService`, `IHashService`, repo interfaces, `ILogger`). See `aita-be-services-and-ports`.
4. `infrastructure/mappers/<x>.mapper.ts` — static `toDomain(raw)` (Prisma row → entity) + `toPersistence`/`toCreateData`/`toUpdateData`. Called **only from the repository**. See `aita-be-prisma`.
5. `infrastructure/repositories/prisma-<x>-repository.ts` — implements the interface, delegates row↔entity to the mapper, centralizes `include` relations.
6. `presentation/<x>.controller.ts` — `extends BaseController`; thin: log → `Dto.from(req.body)` → `useCase.execute({ dto, user: req.user! })` → `this.ok/created(res, result, MESSAGES.X)`. No business logic, no Prisma.
7. `presentation/<x>.router.ts` — `export class XRouter` (below).
8. Wire in `shared/infrastructure/di-container.ts` (register a `TOKENS` symbol; see `aita-be-services-and-ports`).
9. Mount in `shared/presentation/route-manager.ts`: `this.router.use('/x', new XRouter().router)`. `npm run build` must pass.

## Router class
```ts
export class SubjectsRouter {
  public readonly router: Router
  constructor() { this.router = Router(); this.registerRoutes() }
  private registerRoutes() {
    const controller = container.get<SubjectsController>(TOKENS.SubjectController)
    this.router.get('/', authenticate, asyncHandler((req, res) => controller.list(req, res)))
    this.router.post('/', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.create(req, res)))
  }
}
```
Order is always `authenticate` → `requireRoles(...)` → `asyncHandler(arrow)`. Routes are relative to the mount prefix (the prefix lives only in `route-manager.ts`). Import `asyncHandler` from `shared/presentation/async-handler.js` (a stale duplicate in `utils/async-handler.js` is still imported by `ai`/`classes` routers — prefer the shared one).

## Controller (extends BaseController)
```ts
export class SubjectsController extends BaseController {
  constructor(private readonly listUseCase: ListSubjectsUseCase, /* …use-cases */ private readonly logger: ILogger) { super() }
  async list(_req: Request, res: Response): Promise<void> {
    this.logger.debug('Fetching list of subjects')
    const result = await this.listUseCase.execute()
    this.ok(res, result, MESSAGES.SUBJECT_LIST_SUCCESS)
  }
}
```
`BaseController` (`shared/presentation/base-controller.ts`) provides `this.ok/created/noContent/paginated`. Use `MESSAGES.*` constants (`shared/constants/messages.ts`) for the Vietnamese message — never inline strings. See `aita-be-api-and-errors`.

## DI container
`shared/infrastructure/di-container.ts` — hand-wired singleton (`Map<string | symbol, unknown>`, `DIContainer.getInstance()` exported as `container`). A new module = a block in `registerDependencies()`: instantiate uow/repos → use-cases (positional injection) → controller → `this.services.set(TOKENS.XController, ctrl)` (and often a string alias). Resolve via `container.get<T>(TOKENS.X)`. No decorators/reflection. See `aita-be-services-and-ports`.

Reference modules: **`auth`** (rich — ports, transactions, refresh tokens) and **`subjects`** (clean minimal CRUD). See `aita-be-api-and-errors`, `aita-be-validation-and-auth`, `aita-be-prisma`, `aita-be-services-and-ports`.
