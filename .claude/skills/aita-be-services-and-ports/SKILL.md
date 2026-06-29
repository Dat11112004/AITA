---
name: aita-be-services-and-ports
description: Use when an AITA backend use-case needs a cross-cutting service (token signing, password hashing, domain events) — the shared ports (ITokenService/IHashService/IEventDispatcher), their implementations, the TOKENS symbol registry, and how the DI container injects them.
---

# AITA BE — Shared Services & Ports

The refactor extracted cross-cutting concerns behind **ports** (interfaces in `shared/application/ports/`) implemented in `shared/infrastructure/`. Use-cases depend on the **interface**, never the concrete class. Wiring is hand-done in the DI container.

## Ports (`be/src/shared/application/ports/`)
```ts
// i-token-service.ts
export interface TokenPayload { userId: string; email: string; role: string; fullName: string }
export interface ITokenService {
  sign(payload: TokenPayload): string
  verify(token: string): TokenPayload     // throws on invalid/expired
}
// i-hash-service.ts
export interface IHashService {
  hash(plain: string): Promise<string>
  compare(plain: string, hashed: string): Promise<boolean>
}
// i-event-dispatcher.ts
export interface IEventDispatcher {
  dispatch(events: DomainEvent[]): Promise<void>
  register(eventType: string, handler: IEventHandler): void
}
```
Also here: `unit-of-work.interface.ts` (`IUnitOfWork`, see `aita-be-prisma`), `logger.interface.ts` (`ILogger`), `ai-service.interface.ts`.

## Implementations (`be/src/shared/infrastructure/`)
```ts
// jwt-token-service.ts — JwtTokenService implements ITokenService
sign(p) { return jwt.sign({ sub: p.userId, email: p.email, role: p.role, fullName: p.fullName }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN }) }
verify(t) { const d = jwt.verify(t, env.JWT_SECRET) as ...; return { userId: d.sub, email: d.email, role: d.role, fullName: d.fullName } }
// bcrypt-hash-service.ts — BcryptHashService (SALT_ROUNDS = 10)
hash(p)        { return bcrypt.hash(p, SALT_ROUNDS) }
compare(p, h)  { return bcrypt.compare(p, h) }
// event-dispatcher.ts — class is InMemoryEventDispatcher
```
Notes: the JWT on the wire still uses `sub`; the `TokenPayload` abstraction exposes `userId`. `ITokenService` has **no** refresh-token method — refresh tokens are random hex strings persisted via `PrismaRefreshTokenRepository` (see `aita-be-validation-and-auth`).

## TOKENS registry (`be/src/shared/infrastructure/tokens.ts`)
DI keys are `Symbol.for(...)` in one `as const` object — services, repositories, and controllers each have a token:
```ts
export const TOKENS = {
  UnitOfWork: Symbol.for('UnitOfWork'),
  TokenService: Symbol.for('TokenService'),
  HashService: Symbol.for('HashService'),
  Logger: Symbol.for('Logger'),
  EventDispatcher: Symbol.for('EventDispatcher'),
  // …repository + controller symbols (UserRepository, AuthController, …)
} as const
```

## DI container injects them (`be/src/shared/infrastructure/di-container.ts`)
`DIContainer` is a hand-wired singleton (`Map<string | symbol, unknown>`, `getInstance()` → exported `container`). Services are instantiated once, then passed **positionally** into use-case constructors:
```ts
const tokenService = new JwtTokenService()
const hashService  = new BcryptHashService()
this.services.set(TOKENS.TokenService, tokenService)
this.services.set(TOKENS.HashService, hashService)
// use-cases receive the ports via constructor:
const loginUseCase = new LoginUseCase(userRepo, refreshTokenRepo, tokenService, hashService, logger)
```
Controllers/services are registered under **both** a string key and a `TOKENS` symbol; routers resolve via `container.get<T>(TOKENS.X)` (some legacy lookups use the string key, e.g. `container.get<ClassesController>('ClassController')`). `container.get` throws if the key is missing. There is no public `register` — add a block inside `registerDependencies()`.

## Rules
1. A use-case constructor takes **port interfaces** (`ITokenService`, `IHashService`, `IUnitOfWork`, `ILogger`) + repo interfaces — never `new` a service inside a use-case.
2. The **one exception** is `middleware/auth.ts`, which uses a module-level `new JwtTokenService()` singleton for `verify` (middleware is not DI-wired).
3. Tx-scoped repos are pulled inside `uow.runInTransaction` via `txUow.resolve<T>(TOKENS.X)` (see `aita-be-prisma`).

**Wired-but-inert today:** `InMemoryEventDispatcher` is registered but no handlers are `register()`-ed anywhere — domain events are collected but not consumed yet.

See `aita-be-validation-and-auth`, `aita-be-architecture`, `aita-be-prisma`.
