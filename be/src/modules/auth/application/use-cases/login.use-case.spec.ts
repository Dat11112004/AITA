/**
 * Unit Tests — F001 / Login  (LoginUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "Login"):
 *   UTCID01 (N) — Valid credentials, active user            → success payload
 *   UTCID02 (N) — Success side-effects                      → 7-day refresh token + signed access token
 *   UTCID03 (B) — Active user with empty roles              → primaryRole defaults to STUDENT
 *   UTCID04 (A) — Unknown email (findByEmail → null)        → UnauthorizedError, no side-effects
 *   UTCID05 (A) — Inactive user (status Inactive)           → UnauthorizedError, no token
 *   UTCID06 (A) — Wrong password (compare → false)          → UnauthorizedError, no token
 *   UTCID07 (A) — Missing password hash (passwordHash null) → UnauthorizedError before compare
 *
 * Requirement (FO01): LoginUseCase.execute resolves the user by email; rejects unknown,
 * inactive and wrong-password attempts with the SAME UnauthorizedError so accounts cannot
 * be enumerated; records the login; signs an access token via ITokenService; and persists
 * a 7-day refresh token.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { LoginUseCase } from './login.use-case.js'
import { User, UserRoleType, UserStatusType } from '../../domain/entities/user.entity.js'
import { RefreshToken } from '../../domain/entities/refresh-token.entity.js'
import { UnauthorizedError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import type { TokenPayload } from '../../../../shared/application/ports/i-token-service.js'

// ── Test data builder ─────────────────────────────────────────────
interface UserOverrides {
  id?: string
  email?: string | null
  passwordHash?: string | null
  fullName?: string | null
  status?: UserStatusType | null
  roles?: UserRoleType[]
}

function makeUser(over: UserOverrides = {}): User {
  return User.restore(
    over.id ?? 'user-1',
    over.email === undefined ? 'lecturer@fpt.edu.vn' : over.email,
    over.passwordHash === undefined ? 'hashed-pw' : over.passwordHash,
    over.fullName === undefined ? 'Test Lecturer' : over.fullName,
    null, // studentCode
    null, // lecturerCode
    null, // phone
    null, // avatar
    over.status === undefined ? 'Active' : over.status,
    null, // lastLoginAt
    null, // resetPasswordOtp
    null, // resetPasswordOtpExpiry
    over.roles ?? ['LECTURER'],
  )
}

const VALID_INPUT = { dto: { email: 'lecturer@fpt.edu.vn', password: 'Secret123' } }

describe('F001 / Login — LoginUseCase.execute', () => {
  let userRepo: {
    findByEmail: jest.Mock<(email: string) => Promise<User | null>>
    save: jest.Mock<(u: User) => Promise<void>>
  }
  let refreshTokenRepo: { save: jest.Mock<(t: RefreshToken) => Promise<void>> }
  let tokenService: { sign: jest.Mock<(p: TokenPayload) => string> }
  let hashService: { compare: jest.Mock<(a: string, b: string) => Promise<boolean>> }
  let logger: {
    info: jest.Mock<(m: string) => void>
    warn: jest.Mock<(m: string) => void>
    debug: jest.Mock<(m: string) => void>
    error: jest.Mock<(m: string) => void>
    createChild: jest.Mock<() => unknown>
  }
  let useCase: LoginUseCase

  beforeEach(() => {
    userRepo = {
      findByEmail: jest.fn<(email: string) => Promise<User | null>>(),
      save: jest.fn<(u: User) => Promise<void>>().mockResolvedValue(undefined),
    }
    refreshTokenRepo = {
      save: jest.fn<(t: RefreshToken) => Promise<void>>().mockResolvedValue(undefined),
    }
    tokenService = { sign: jest.fn<(p: TokenPayload) => string>().mockReturnValue('signed-access-token') }
    hashService = { compare: jest.fn<(a: string, b: string) => Promise<boolean>>() }
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      createChild: jest.fn(),
    }
    useCase = new LoginUseCase(
      userRepo as any,
      refreshTokenRepo as any,
      tokenService as any,
      hashService as any,
      logger as any,
    )
  })

  // ── UTCID01 (Normal) — valid credentials, active user → success payload ──
  test('UTCID01: returns a token pair and lowercased role for valid, active credentials', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ roles: ['LECTURER'] }))
    hashService.compare.mockResolvedValue(true)

    const result = await useCase.execute(VALID_INPUT as any)

    expect(result.token).toBe('signed-access-token')
    expect(result.refreshToken).toMatch(/^[0-9a-f]{128}$/) // randomBytes(64).toString('hex')
    expect(result.user.role).toBe('lecturer')
    expect(result.user.id).toBe('user-1')
    // Login recorded (user persisted) and refresh token stored exactly once.
    expect(userRepo.save).toHaveBeenCalledTimes(1)
    expect(refreshTokenRepo.save).toHaveBeenCalledTimes(1)
    // Log message on the success path.
    expect(logger.info).toHaveBeenCalledWith('Login successful for user: user-1')
  })

  // ── UTCID02 (Normal) — success side-effects: token payload + 7-day refresh ──
  test('UTCID02: signs the access token with the user payload and persists a 7-day refresh token', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ id: 'user-1', roles: ['LECTURER'] }))
    hashService.compare.mockResolvedValue(true)

    const result = await useCase.execute(VALID_INPUT as any)

    // Access token signed with the correct payload.
    expect(tokenService.sign).toHaveBeenCalledWith({
      userId: 'user-1',
      email: 'lecturer@fpt.edu.vn',
      role: 'LECTURER',
      fullName: 'Test Lecturer',
    })
    // Refresh token entity persisted, matching the returned string, ~7 days ahead.
    const saved = refreshTokenRepo.save.mock.calls[0][0]
    expect(saved.token).toBe(result.refreshToken)
    expect(saved.isRevoked).toBe(false)
    const daysAhead = (saved.expiresAt!.getTime() - Date.now()) / 86_400_000
    expect(daysAhead).toBeGreaterThan(6.9)
    expect(daysAhead).toBeLessThan(7.1)
  })

  // ── UTCID03 (Boundary) — active user with empty roles → default STUDENT ──
  test('UTCID03: falls back to the STUDENT role when the user has no roles', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ roles: [] }))
    hashService.compare.mockResolvedValue(true)

    const result = await useCase.execute(VALID_INPUT as any)

    expect(tokenService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'STUDENT' }),
    )
    expect(result.user.role).toBe('student')
  })

  // ── UTCID04 (Abnormal) — unknown email → UnauthorizedError, no side-effects ──
  test('UTCID04: rejects an unknown email with UnauthorizedError and no side-effects', async () => {
    userRepo.findByEmail.mockResolvedValue(null)

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toMatchObject({
      constructor: UnauthorizedError,
      message: MESSAGES.AUTH_INVALID_CREDENTIALS,
    })
    expect(hashService.compare).not.toHaveBeenCalled()
    expect(tokenService.sign).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
    expect(refreshTokenRepo.save).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  // ── UTCID05 (Abnormal) — inactive user → UnauthorizedError, no token ──
  test('UTCID05: rejects an inactive user with the same UnauthorizedError (no enumeration)', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ status: 'Inactive' }))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toThrow(UnauthorizedError)
    await expect(useCase.execute(VALID_INPUT as any)).rejects.toThrow(
      MESSAGES.AUTH_INVALID_CREDENTIALS,
    )
    expect(hashService.compare).not.toHaveBeenCalled()
    expect(tokenService.sign).not.toHaveBeenCalled()
  })

  // ── UTCID06 (Abnormal) — wrong password → UnauthorizedError, no token ──
  test('UTCID06: rejects a wrong password with the same UnauthorizedError', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser())
    hashService.compare.mockResolvedValue(false)

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toMatchObject({
      constructor: UnauthorizedError,
      message: MESSAGES.AUTH_INVALID_CREDENTIALS,
    })
    expect(hashService.compare).toHaveBeenCalledTimes(1)
    expect(tokenService.sign).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID07 (Abnormal) — missing password hash → reject before compare ──
  test('UTCID07: rejects when the account has no password hash, without calling compare', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ passwordHash: null }))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toMatchObject({
      constructor: UnauthorizedError,
      message: MESSAGES.AUTH_INVALID_CREDENTIALS,
    })
    // Short-circuits on the falsy hash — compare must never run.
    expect(hashService.compare).not.toHaveBeenCalled()
    expect(tokenService.sign).not.toHaveBeenCalled()
  })
})
