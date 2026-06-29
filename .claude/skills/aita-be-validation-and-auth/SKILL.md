---
name: aita-be-validation-and-auth
description: Use when validating input or protecting routes in the AITA backend — Zod DTO factories (static from()), and the V2 auth (access+refresh tokens via ITokenService, bcrypt via IHashService, role guards). There is NO passport/OAuth/session despite installed deps.
---

# AITA BE — Validation (Zod DTO) & Auth (JWT V2)

## Validation — DTO with static `from()`
Validate at the **controller boundary** via a DTO factory that runs `schema.parse()`. The standard shape is a class with a static `schema` + `static from()` that copies parsed fields (real example, `auth.dto.ts`):
```ts
export class LoginRequestDto {
  email!: string; password!: string
  static readonly schema = z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(6, 'Mật khẩu phải chứa ít nhất 6 ký tự'),
  })
  static from(data: unknown): LoginRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new LoginRequestDto(); dto.email = parsed.email; dto.password = parsed.password; return dto
  }
}
```
A terser `Object.assign(dto, schema.parse(data))` variant is also used (e.g. `class.dto.ts` `UpdateClassNoteDto`). Conventions: **Vietnamese messages** as the 2nd Zod arg; **UPPERCASE enums** (`z.enum(['ADMIN','LECTURER','STUDENT'])`); refinements via `.refine()` (e.g. register enforces `@gmail.com`); **never catch `ZodError`** — let it bubble to `errorHandler`.

**Response DTO** maps Prisma/domain → camelCase API and lowercases role/status (real example, `auth.dto.ts` `AuthResponseDto.from`):
```ts
dto.token = token; dto.refreshToken = refreshToken
const role = primaryRole || user.roles[0] || 'STUDENT'
dto.user = { id: user.id, email: user.email, fullName: user.fullName, /*…*/ role: role.toLowerCase(), status: (user.status || 'active').toLowerCase() }
```

## Auth V2 — access + refresh tokens (JWT + bcrypt only; NO passport/OAuth/session)
Tokens and hashing go through **ports** (`ITokenService`, `IHashService`) injected into use-cases — see `aita-be-services-and-ports`. Use-cases never call `jwt`/`bcrypt` directly.

**Middleware (`be/src/middleware/auth.ts`)** verifies the access token via a `JwtTokenService` singleton and maps `payload.userId` → `req.user.id`:
```ts
const tokenService = new JwtTokenService()      // singleton; use-cases use ITokenService via DI instead
export function authenticate(req, _res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next(new UnauthorizedError())
  try {
    const payload = tokenService.verify(header.slice(7))
    req.user = { id: payload.userId, email: payload.email, role: payload.role, fullName: payload.fullName }
    next()
  } catch { next(new UnauthorizedError('Token không hợp lệ')) }
}
export function requireRoles(...roles: string[]) {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError())
    if (!roles.includes(req.user.role)) return next(new ForbiddenError())
    next()
  }
}
```
`req.user` is typed `AuthUser { id; email; role; fullName }` in `src/types/express.d.ts`.

**Token lifecycle (`modules/auth`):**
- **Login** issues an **access token** (`tokenService.sign({ userId, email, role, fullName })`) + a **refresh token** = `randomBytes(64).toString('hex')`, persisted in the `RefreshToken` table with a 7-day expiry. Password check is `hashService.compare(...)`.
- **Register** (`/register`) is Gmail-only (`.refine(e => e.endsWith('@gmail.com'))`), hashes via `hashService.hash`, then in `uow.runInTransaction` creates the user, assigns the `STUDENT` role (`findRoleByName`/`assignRole`), writes an audit activity, and issues tokens.
- **Refresh** (`/refresh-token`) does **rotation**: validate the presented refresh token → `currentToken.revoke()` + save → issue a brand-new access + refresh pair.
- **Logout** (`/logout`) is server-side revocation: look up the refresh token and `revoke()` it (idempotent). `IRefreshTokenRepository` also has `revokeAllForUser` (defined, not yet used).
- **Change-password** (`/change-password`) verifies the old password via `hashService.compare`, then `user.changePassword(hash)`.

**Routes (`auth.router.ts`):** public — `POST /login`, `/register`, `/refresh-token`; authenticated (`authenticate`) — `GET /me`, `POST /change-password`, `POST /logout`. No `requireRoles` on auth routes.

## Rules
1. **Default-deny** — every non-public route gets `authenticate`; public today: `/auth/login`, `/auth/register`, `/auth/refresh-token`, `/health`.
2. **Roles are UPPERCASE** in DB + JWT + guards (`requireRoles('ADMIN','LECTURER')`); only Response DTOs lowercase for the FE.
3. **Never trust ownership from the body** — derive ids from `req.user!.id`.
4. **Hashing/signing via the injected port**, not inline `bcrypt`/`jwt` (the only inline use is the middleware `verify` singleton).
5. Known caveat: revoking a refresh token does **not** invalidate an already-issued access JWT until it expires.

See `aita-be-services-and-ports`, `aita-be-prisma`, `aita-be-api-and-errors`.
