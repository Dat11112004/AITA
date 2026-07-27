/**
 * Unit Tests — FO02 / RefreshToken  (RefreshTokenUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "RefreshToken"):
 *   UTCID01 (N) — Valid token, active user, role present → new token pair (rotation)
 *   UTCID02 (N) — Success side-effects                   → old token revoked first, new 7-day refresh
 *   UTCID03 (B) — Active user with empty roles           → primaryRole defaults to STUDENT
 *   UTCID04 (A) — Token not found (findByToken → null)   → UnauthorizedError, no lookup, no writes
 *   UTCID05 (A) — Token revoked/expired (isValid false)  → UnauthorizedError, no writes
 *   UTCID06 (A) — Valid token but user not found         → UnauthorizedError, no rotation
 *   UTCID07 (A) — Valid token but user inactive          → UnauthorizedError, no rotation
 *
 * Requirement (FO02): RefreshTokenUseCase.execute rejects a missing, invalid, expired or
 * revoked refresh token, and a token whose user is missing/inactive, with the SAME
 * UnauthorizedError. On success it rotates the token — revokes and persists the old one,
 * signs a fresh access token for the user's primary role, and persists a new 7-day refresh
 * token — returning the auth payload.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { RefreshTokenUseCase } from './refresh-token.use-case.js'
import { User, UserRoleType, UserStatusType } from '../../domain/entities/user.entity.js'
import { RefreshToken } from '../../domain/entities/refresh-token.entity.js'
import { UnauthorizedError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import type { TokenPayload } from '../../../../shared/application/ports/i-token-service.js'

// ── Test data builders ────────────────────────────────────────────
function futureDate(days = 7): Date {
  return new Date(Date.now() + days * 86_400_000)
}

function makeToken(over: {
  id?: string
  userId?: string | null
  token?: string | null
  expiresAt?: Date | null
  isRevoked?: boolean | null
} = {}): RefreshToken {
  return RefreshToken.restore(
    over.id ?? 'rt-old',
    over.userId === undefined ? 'user-1' : over.userId,
    over.token ?? 'old-refresh-token',
    over.expiresAt === undefined ? futureDate() : over.expiresAt,
    over.isRevoked ?? false,
  )
}

function makeUser(over: {
  id?: string
  email?: string | null
  status?: UserStatusType | null
  roles?: UserRoleType[]
} = {}): User {
  return User.restore(
    over.id ?? 'user-1',
    over.email === undefined ? 'lecturer@fpt.edu.vn' : over.email,
    'hashed-pw',
    'Test Lecturer',
    null, null, null, null,
    over.status === undefined ? 'Active' : over.status,
    null, null, null,
    over.roles ?? ['LECTURER'],
  )
}

const VALID_INPUT = { dto: { refreshToken: 'old-refresh-token' } }

describe('FO02 / RefreshToken — RefreshTokenUseCase.execute', () => {
  let refreshTokenRepo: {
    findByToken: jest.Mock<(t: string) => Promise<RefreshToken | null>>
    save: jest.Mock<(t: RefreshToken) => Promise<void>>
  }
  let userRepo: { findById: jest.Mock<(id: string) => Promise<User | null>> }
  let tokenService: { sign: jest.Mock<(p: TokenPayload) => string> }
  let logger: {
    info: jest.Mock<(m: string) => void>
    warn: jest.Mock<(m: string) => void>
    debug: jest.Mock<(m: string) => void>
    error: jest.Mock<(m: string) => void>
    createChild: jest.Mock<() => unknown>
  }
  let useCase: RefreshTokenUseCase

  beforeEach(() => {
    refreshTokenRepo = {
      findByToken: jest.fn<(t: string) => Promise<RefreshToken | null>>(),
      save: jest.fn<(t: RefreshToken) => Promise<void>>().mockResolvedValue(undefined),
    }
    userRepo = { findById: jest.fn<(id: string) => Promise<User | null>>() }
    tokenService = { sign: jest.fn<(p: TokenPayload) => string>().mockReturnValue('new-access-token') }
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      createChild: jest.fn(),
    }
    useCase = new RefreshTokenUseCase(
      refreshTokenRepo as any,
      userRepo as any,
      tokenService as any,
      logger as any,
    )
  })

  // ── UTCID01 (Normal) — valid token + active user → rotated token pair ──
  test('UTCID01: issues a new token pair and rotates the refresh token for a valid token', async () => {
    refreshTokenRepo.findByToken.mockResolvedValue(makeToken())
    userRepo.findById.mockResolvedValue(makeUser({ roles: ['LECTURER'] }))

    const result = await useCase.execute(VALID_INPUT as any)

    expect(result.token).toBe('new-access-token')
    expect(result.refreshToken).toMatch(/^[0-9a-f]{128}$/) // randomBytes(64).toString('hex')
    expect(result.user.role).toBe('lecturer')
    expect(result.user.id).toBe('user-1')
    // Rotation = exactly two saves: the revoked old token, then the fresh one.
    expect(refreshTokenRepo.save).toHaveBeenCalledTimes(2)
    expect(logger.info).toHaveBeenCalledWith('Successfully refreshed token for user: user-1')
  })

  // ── UTCID02 (Normal) — rotation side-effects: revoke-then-issue, 7-day refresh ──
  test('UTCID02: revokes the old token first, then signs and persists a new 7-day refresh token', async () => {
    refreshTokenRepo.findByToken.mockResolvedValue(makeToken({ id: 'rt-old', token: 'old-refresh-token' }))
    userRepo.findById.mockResolvedValue(makeUser({ id: 'user-1', roles: ['LECTURER'] }))

    const result = await useCase.execute(VALID_INPUT as any)

    // First save is the OLD token, now revoked.
    const firstSaved = refreshTokenRepo.save.mock.calls[0][0]
    expect(firstSaved.id).toBe('rt-old')
    expect(firstSaved.isRevoked).toBe(true)

    // Second save is a NEW token: different string, not revoked, ~7 days ahead.
    const secondSaved = refreshTokenRepo.save.mock.calls[1][0]
    expect(secondSaved.token).toBe(result.refreshToken)
    expect(secondSaved.token).not.toBe('old-refresh-token')
    expect(secondSaved.isRevoked).toBe(false)
    const daysAhead = (secondSaved.expiresAt!.getTime() - Date.now()) / 86_400_000
    expect(daysAhead).toBeGreaterThan(6.9)
    expect(daysAhead).toBeLessThan(7.1)

    // Access token signed with the user's primary role.
    expect(tokenService.sign).toHaveBeenCalledWith({
      userId: 'user-1',
      email: 'lecturer@fpt.edu.vn',
      role: 'LECTURER',
      fullName: 'Test Lecturer',
    })
  })

  // ── UTCID03 (Boundary) — active user with empty roles → default STUDENT ──
  test('UTCID03: falls back to the STUDENT role when the user has no roles', async () => {
    refreshTokenRepo.findByToken.mockResolvedValue(makeToken())
    userRepo.findById.mockResolvedValue(makeUser({ roles: [] }))

    const result = await useCase.execute(VALID_INPUT as any)

    expect(tokenService.sign).toHaveBeenCalledWith(expect.objectContaining({ role: 'STUDENT' }))
    expect(result.user.role).toBe('student')
  })

  // ── UTCID04 (Abnormal) — token not found → UnauthorizedError, no side-effects ──
  test('UTCID04: rejects an unknown refresh token without looking up a user or writing', async () => {
    refreshTokenRepo.findByToken.mockResolvedValue(null)

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toMatchObject({
      constructor: UnauthorizedError,
      message: MESSAGES.AUTH_INVALID_REFRESH_TOKEN,
    })
    expect(userRepo.findById).not.toHaveBeenCalled()
    expect(refreshTokenRepo.save).not.toHaveBeenCalled()
    expect(tokenService.sign).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  // ── UTCID05 (Abnormal) — revoked/expired token → UnauthorizedError, no writes ──
  test('UTCID05: rejects a revoked (invalid) token with the same UnauthorizedError', async () => {
    refreshTokenRepo.findByToken.mockResolvedValue(makeToken({ isRevoked: true }))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toMatchObject({
      constructor: UnauthorizedError,
      message: MESSAGES.AUTH_INVALID_REFRESH_TOKEN,
    })
    expect(userRepo.findById).not.toHaveBeenCalled()
    expect(refreshTokenRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID06 (Abnormal) — valid token, user missing → UnauthorizedError, no rotation ──
  test('UTCID06: rejects when the token is valid but the user no longer exists', async () => {
    refreshTokenRepo.findByToken.mockResolvedValue(makeToken())
    userRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toMatchObject({
      constructor: UnauthorizedError,
      message: MESSAGES.AUTH_INVALID_REFRESH_TOKEN,
    })
    // No rotation happened — the old token was never revoked/saved.
    expect(refreshTokenRepo.save).not.toHaveBeenCalled()
    expect(tokenService.sign).not.toHaveBeenCalled()
  })

  // ── UTCID07 (Abnormal) — valid token, inactive user → UnauthorizedError, no rotation ──
  test('UTCID07: rejects when the token is valid but the user is inactive', async () => {
    refreshTokenRepo.findByToken.mockResolvedValue(makeToken())
    userRepo.findById.mockResolvedValue(makeUser({ status: 'Inactive' }))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toMatchObject({
      constructor: UnauthorizedError,
      message: MESSAGES.AUTH_INVALID_REFRESH_TOKEN,
    })
    expect(refreshTokenRepo.save).not.toHaveBeenCalled()
    expect(tokenService.sign).not.toHaveBeenCalled()
  })
})
