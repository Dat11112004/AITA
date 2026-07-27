/**
 * Unit Tests — FO03 / Logout  (LogoutUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "Logout"):
 *   UTCID01 (N) — Known, active token                    → revoked once and persisted
 *   UTCID02 (N) — Success side-effects                   → same entity saved, RevokedEvent raised
 *   UTCID03 (B) — Expired but NOT revoked                → still revoked (gate is isRevoked only)
 *   UTCID04 (B) — isRevoked = null (nullable column)     → treated as not revoked → revoked
 *   UTCID05 (A) — Token not found (findByToken → null)   → no write, warning logged
 *   UTCID06 (A) — Token already revoked                  → no write, warning logged
 *   UTCID07 (A) — Repository lookup fails                → error propagates, no write
 *
 * Requirement (FO03): LogoutUseCase.execute revokes and persists the caller's refresh token
 * when that token exists and is not already revoked. It NEVER throws for an unknown or
 * already-revoked token — it logs a warning and performs no write, so logout stays
 * idempotent. Note the gate is `!currentToken.isRevoked` ONLY: an expired-but-unrevoked
 * token is still revoked and saved.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { LogoutUseCase } from './logout.use-case.js'
import { RefreshToken, RefreshTokenRevokedEvent } from '../../domain/entities/refresh-token.entity.js'

// ── Test data builders ────────────────────────────────────────────
function futureDate(days = 7): Date {
  return new Date(Date.now() + days * 86_400_000)
}

function pastDate(days = 1): Date {
  return new Date(Date.now() - days * 86_400_000)
}

function makeToken(over: {
  id?: string
  userId?: string | null
  token?: string | null
  expiresAt?: Date | null
  isRevoked?: boolean | null
} = {}): RefreshToken {
  return RefreshToken.restore(
    over.id ?? 'rt-1',
    over.userId === undefined ? 'user-1' : over.userId,
    over.token ?? 'current-refresh-token',
    over.expiresAt === undefined ? futureDate() : over.expiresAt,
    over.isRevoked === undefined ? false : over.isRevoked,
  )
}

const VALID_INPUT = { dto: { refreshToken: 'current-refresh-token' } }

describe('FO03 / Logout — LogoutUseCase.execute', () => {
  let refreshTokenRepo: {
    findByToken: jest.Mock<(t: string) => Promise<RefreshToken | null>>
    save: jest.Mock<(t: RefreshToken) => Promise<void>>
  }
  let logger: {
    info: jest.Mock<(m: string) => void>
    warn: jest.Mock<(m: string) => void>
    debug: jest.Mock<(m: string) => void>
    error: jest.Mock<(m: string) => void>
    createChild: jest.Mock<() => unknown>
  }
  let useCase: LogoutUseCase

  beforeEach(() => {
    refreshTokenRepo = {
      findByToken: jest.fn<(t: string) => Promise<RefreshToken | null>>(),
      save: jest.fn<(t: RefreshToken) => Promise<void>>().mockResolvedValue(undefined),
    }
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      createChild: jest.fn(),
    }
    useCase = new LogoutUseCase(refreshTokenRepo as any, logger as any)
  })

  // ── UTCID01 (Normal) — known active token → revoked and persisted ──
  test('UTCID01: revokes and persists a known, active refresh token', async () => {
    const token = makeToken({ id: 'rt-1' })
    refreshTokenRepo.findByToken.mockResolvedValue(token)

    await expect(useCase.execute(VALID_INPUT as any)).resolves.toBeUndefined()

    expect(refreshTokenRepo.findByToken).toHaveBeenCalledWith('current-refresh-token')
    expect(token.isRevoked).toBe(true)
    expect(refreshTokenRepo.save).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith('Successfully revoked refresh token id: rt-1')
    expect(logger.warn).not.toHaveBeenCalled()
  })

  // ── UTCID02 (Normal) — side-effects: same entity saved, domain event raised ──
  test('UTCID02: saves the same token entity it revoked and raises RefreshTokenRevokedEvent', async () => {
    const token = makeToken({ id: 'rt-42' })
    refreshTokenRepo.findByToken.mockResolvedValue(token)

    await useCase.execute(VALID_INPUT as any)

    // The persisted instance IS the revoked aggregate — not a copy.
    const saved = refreshTokenRepo.save.mock.calls[0][0]
    expect(saved).toBe(token)
    expect(saved.isRevoked).toBe(true)

    const events = (token as any).domainEvents ?? []
    expect(events.some((e: unknown) => e instanceof RefreshTokenRevokedEvent)).toBe(true)
  })

  // ── UTCID03 (Boundary) — expired but not revoked → still revoked ──
  test('UTCID03: revokes an expired-but-unrevoked token (the gate is isRevoked, not expiry)', async () => {
    const token = makeToken({ expiresAt: pastDate(), isRevoked: false })
    expect(token.isExpired()).toBe(true) // precondition: genuinely expired

    await refreshTokenRepo.findByToken.mockResolvedValue(token)
    await useCase.execute(VALID_INPUT as any)

    expect(token.isRevoked).toBe(true)
    expect(refreshTokenRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID04 (Boundary) — nullable isRevoked = null → treated as not revoked ──
  test('UTCID04: treats a null isRevoked as not-revoked and revokes the token', async () => {
    const token = makeToken({ isRevoked: null })
    refreshTokenRepo.findByToken.mockResolvedValue(token)

    await useCase.execute(VALID_INPUT as any)

    expect(token.isRevoked).toBe(true)
    expect(refreshTokenRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID05 (Abnormal) — unknown token → no write, warning, no throw ──
  test('UTCID05: logs a warning and writes nothing when the token is unknown', async () => {
    refreshTokenRepo.findByToken.mockResolvedValue(null)

    await expect(useCase.execute(VALID_INPUT as any)).resolves.toBeUndefined()

    expect(refreshTokenRepo.save).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('Token not found or already revoked during logout')
  })

  // ── UTCID06 (Abnormal) — already revoked → idempotent no-op ──
  test('UTCID06: is idempotent — an already-revoked token is not saved again', async () => {
    const token = makeToken({ isRevoked: true })
    refreshTokenRepo.findByToken.mockResolvedValue(token)

    await expect(useCase.execute(VALID_INPUT as any)).resolves.toBeUndefined()

    expect(refreshTokenRepo.save).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('Token not found or already revoked during logout')
  })

  // ── UTCID07 (Abnormal) — repository failure propagates, nothing persisted ──
  test('UTCID07: propagates a repository lookup failure without writing', async () => {
    refreshTokenRepo.findByToken.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toThrow('DB connection lost')

    expect(refreshTokenRepo.save).not.toHaveBeenCalled()
  })
})
