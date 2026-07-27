/**
 * Unit Tests — FO07 / RegisterStudent  (RegisterStudentUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "RegisterStudent"):
 *   UTCID01 (N) — New email, STUDENT role exists     → success payload + every side-effect once
 *   UTCID02 (N) — Success side-effects               → hashed up front, token payload, refresh saved
 *   UTCID03 (N) — Transactional integrity            → exactly ONE transaction, tx-scoped repos
 *   UTCID04 (B) — Mixed-case email                   → looked up raw, stored/signed lowercased
 *   UTCID05 (B) — STUDENT role missing in DB         → still succeeds, assignRole skipped, warn
 *   UTCID06 (B) — Refresh expiry window              → exactly 7 days from now
 *   UTCID07 (B) — Refresh token format               → 128 lowercase hex chars, unique per call
 *   UTCID08 (A) — Email already in use               → ConflictError before hashing / transaction
 *   UTCID09 (A) — Duplicate-check lookup fails       → propagates, nothing hashed, no transaction
 *   UTCID10 (A) — Password hashing fails             → propagates, transaction never opened
 *   UTCID11 (A) — User insert fails inside the tx    → propagates, no token signed, no refresh
 *   UTCID12 (A) — Audit-trail write fails            → propagates, refresh token never saved
 *   UTCID13 (A) — Refresh-token persistence fails    → propagates
 *   UTCID14 (A) — Transaction itself fails/rolls back → propagates
 *
 * Requirement (FO07): RegisterStudentUseCase.execute rejects a duplicate email with
 * ConflictError BEFORE any hashing or DB write; otherwise it hashes the password, then
 * inside a SINGLE Unit-of-Work transaction creates the user (email lowercased, STUDENT
 * role), assigns the STUDENT role when it exists, records a STUDENT_REGISTER audit entry,
 * signs an access token, and persists a 7-day refresh token — returning the auth payload.
 * Every write inside the transaction goes through repositories resolved from the tx UoW,
 * so any failure in the body aborts the whole registration.
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { RegisterStudentUseCase } from './register.use-case.js'
import { User } from '../../domain/entities/user.entity.js'
import { RefreshToken } from '../../domain/entities/refresh-token.entity.js'
import { ConflictError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import type { TokenPayload } from '../../../../shared/application/ports/i-token-service.js'

const VALID_INPUT = {
  dto: { email: 'new.student@gmail.com', password: 'Secret123', fullName: 'New Student' },
}

describe('FO07 / RegisterStudent — RegisterStudentUseCase.execute', () => {
  // Outer repo — only findByEmail runs before the transaction.
  let userRepo: { findByEmail: jest.Mock<(email: string) => Promise<User | null>> }

  // Transaction-scoped repos, resolved from the tx Unit of Work by token.
  let txUserRepo: {
    create: jest.Mock<(u: User) => Promise<void>>
    findRoleByName: jest.Mock<(name: string) => Promise<{ id: string; name: string } | null>>
    assignRole: jest.Mock<(userId: string, roleId: string) => Promise<void>>
  }
  let txActivityRepo: { create: jest.Mock<(a: unknown) => Promise<void>> }
  let txRefreshTokenRepo: { save: jest.Mock<(t: RefreshToken) => Promise<void>> }

  let txUow: { resolve: jest.Mock }
  let uow: { runInTransaction: jest.Mock }
  let tokenService: { sign: jest.Mock<(p: TokenPayload) => string> }
  let hashService: { hash: jest.Mock<(pw: string) => Promise<string>> }
  let logger: {
    info: jest.Mock<(m: string) => void>
    warn: jest.Mock<(m: string) => void>
    debug: jest.Mock<(m: string) => void>
    error: jest.Mock<(m: string) => void>
    createChild: jest.Mock<() => unknown>
  }
  let useCase: RegisterStudentUseCase

  beforeEach(() => {
    userRepo = { findByEmail: jest.fn<(email: string) => Promise<User | null>>().mockResolvedValue(null) }

    txUserRepo = {
      create: jest.fn<(u: User) => Promise<void>>().mockResolvedValue(undefined),
      findRoleByName: jest
        .fn<(name: string) => Promise<{ id: string; name: string } | null>>()
        .mockResolvedValue({ id: 'role-student', name: 'STUDENT' }),
      assignRole: jest.fn<(userId: string, roleId: string) => Promise<void>>().mockResolvedValue(undefined),
    }
    txActivityRepo = { create: jest.fn<(a: unknown) => Promise<void>>().mockResolvedValue(undefined) }
    txRefreshTokenRepo = { save: jest.fn<(t: RefreshToken) => Promise<void>>().mockResolvedValue(undefined) }

    // The tx Unit of Work resolves the transaction-scoped repos by token.
    txUow = {
      resolve: jest.fn((token: symbol) => {
        if (token === TOKENS.UserRepository) return txUserRepo
        if (token === TOKENS.ActivityRepository) return txActivityRepo
        if (token === TOKENS.RefreshTokenRepository) return txRefreshTokenRepo
        throw new Error(`Unexpected token resolved: ${String(token)}`)
      }),
    }
    // Run the callback synchronously with the tx UoW, like a real transaction body.
    uow = { runInTransaction: jest.fn((cb: (u: typeof txUow) => unknown) => cb(txUow)) }

    tokenService = { sign: jest.fn<(p: TokenPayload) => string>().mockReturnValue('signed-access-token') }
    hashService = { hash: jest.fn<(pw: string) => Promise<string>>().mockResolvedValue('hashed-pw') }
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      createChild: jest.fn(),
    }

    useCase = new RegisterStudentUseCase(
      userRepo as any,
      uow as any,
      tokenService as any,
      hashService as any,
      logger as any,
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — new email, role exists → success payload + side-effects ──
  test('UTCID01: registers a new student and performs every side-effect exactly once', async () => {
    const result = await useCase.execute(VALID_INPUT as any)

    // Auth payload.
    expect(result.token).toBe('signed-access-token')
    expect(result.refreshToken).toMatch(/^[0-9a-f]{128}$/) // randomBytes(64).toString('hex')
    expect(result.user.role).toBe('student')
    expect(result.user.email).toBe('new.student@gmail.com')
    expect(result.user.status).toBe('active')

    // The user persisted in the transaction owns the id echoed back in the payload.
    const createdUser = txUserRepo.create.mock.calls[0][0]
    expect(result.user.id).toBe(createdUser.id)

    // Side-effects — each once, on the transaction-scoped repos.
    expect(txUserRepo.create).toHaveBeenCalledTimes(1)
    expect(txUserRepo.findRoleByName).toHaveBeenCalledWith('STUDENT')
    expect(txUserRepo.assignRole).toHaveBeenCalledWith(createdUser.id, 'role-student')
    expect(txActivityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: createdUser.id,
        action: 'STUDENT_REGISTER',
        entity: 'User',
        entityId: createdUser.id,
      }),
    )
    expect(txRefreshTokenRepo.save).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith(`Student registered successfully: ${createdUser.id}`)
  })

  // ── UTCID02 — success side-effects: hashing, token payload, refresh persisted ──
  test('UTCID02: hashes the password up front, signs the STUDENT payload, and persists the refresh token', async () => {
    const result = await useCase.execute(VALID_INPUT as any)

    // Password hashed once, from the raw input.
    expect(hashService.hash).toHaveBeenCalledWith('Secret123')
    const createdUser = txUserRepo.create.mock.calls[0][0]
    expect(createdUser.passwordHash).toBe('hashed-pw')

    // Access token signed with the created user's STUDENT payload.
    expect(tokenService.sign).toHaveBeenCalledWith({
      userId: createdUser.id,
      email: 'new.student@gmail.com',
      role: 'STUDENT',
      fullName: 'New Student',
    })

    // Refresh token entity persisted and matches the returned string.
    const saved = txRefreshTokenRepo.save.mock.calls[0][0]
    expect(saved.token).toBe(result.refreshToken)
    expect(saved.userId).toBe(createdUser.id)
    expect(saved.isRevoked).toBe(false)
  })

  // ── UTCID03 — the whole registration happens in ONE transaction ──
  test('UTCID03: performs every write inside a single transaction using tx-scoped repositories', async () => {
    await useCase.execute(VALID_INPUT as any)

    // Exactly one transaction for the whole registration.
    expect(uow.runInTransaction).toHaveBeenCalledTimes(1)

    // All three repositories come from the transaction UoW, by token.
    const resolved = txUow.resolve.mock.calls.map((c) => c[0])
    expect(resolved).toContain(TOKENS.UserRepository)
    expect(resolved).toContain(TOKENS.ActivityRepository)
    expect(resolved).toContain(TOKENS.RefreshTokenRepository)

    // The outer repository is only used for the pre-flight duplicate check.
    expect(userRepo.findByEmail).toHaveBeenCalledTimes(1)
    expect(Object.keys(userRepo)).toEqual(['findByEmail'])
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — mixed-case email is normalized to lowercase ──
  test('UTCID04: looks up the raw email but creates and signs with the lowercased address', async () => {
    await useCase.execute({
      dto: { email: 'New.Student@Gmail.COM', password: 'Secret123', fullName: 'New Student' },
    } as any)

    // Duplicate check uses the address as supplied.
    expect(userRepo.findByEmail).toHaveBeenCalledWith('New.Student@Gmail.COM')
    // Persisted entity and signed payload use the lowercased form.
    const createdUser = txUserRepo.create.mock.calls[0][0]
    expect(createdUser.email).toBe('new.student@gmail.com')
    expect(tokenService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new.student@gmail.com' }),
    )
  })

  // ── UTCID05 — STUDENT role absent → succeed, skip assignRole, warn ──
  test('UTCID05: still registers when the STUDENT role is missing, skipping role assignment', async () => {
    txUserRepo.findRoleByName.mockResolvedValue(null)

    const result = await useCase.execute(VALID_INPUT as any)

    expect(result.token).toBe('signed-access-token')
    expect(txUserRepo.create).toHaveBeenCalledTimes(1)
    expect(txUserRepo.assignRole).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('STUDENT role not found in database')
    // The rest of the flow still runs.
    expect(txActivityRepo.create).toHaveBeenCalledTimes(1)
    expect(txRefreshTokenRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID06 — refresh token expires exactly 7 days out ──
  test('UTCID06: sets the refresh-token expiry exactly 7 days ahead', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-21T10:00:00.000Z'))

    await useCase.execute(VALID_INPUT as any)

    const saved = txRefreshTokenRepo.save.mock.calls[0][0]
    const days = (saved.expiresAt!.getTime() - Date.now()) / 86_400_000
    expect(days).toBeCloseTo(7, 5)
  })

  // ── UTCID07 — refresh token format and uniqueness ──
  test('UTCID07: issues a 128-char lowercase hex refresh token, different on every registration', async () => {
    const first = await useCase.execute(VALID_INPUT as any)
    const second = await useCase.execute(VALID_INPUT as any)

    for (const r of [first, second]) {
      expect(r.refreshToken).toMatch(/^[0-9a-f]{128}$/)
      expect(r.refreshToken).toHaveLength(128)
    }
    // 64 random bytes — a collision here would mean the source is not random.
    expect(first.refreshToken).not.toBe(second.refreshToken)
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID08 — duplicate email → ConflictError, no work done ──
  test('UTCID08: rejects a duplicate email with ConflictError before hashing or opening a transaction', async () => {
    userRepo.findByEmail.mockResolvedValue(
      User.restore('existing-1', 'new.student@gmail.com', 'hash', 'Existing', null, null, null, null, 'Active', null, null, null, ['STUDENT']),
    )

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toMatchObject({
      constructor: ConflictError,
      message: MESSAGES.AUTH_EMAIL_IN_USE,
    })
    // Short-circuits: no password hashed, no transaction, no writes.
    expect(hashService.hash).not.toHaveBeenCalled()
    expect(uow.runInTransaction).not.toHaveBeenCalled()
    expect(txUserRepo.create).not.toHaveBeenCalled()
    expect(txRefreshTokenRepo.save).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(`Registration failed: Email already in use: ${VALID_INPUT.dto.email}`)
  })

  // ── UTCID09 — the duplicate-check lookup itself fails ──
  test('UTCID09: propagates a failure of the duplicate-email lookup without hashing or a transaction', async () => {
    userRepo.findByEmail.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toThrow('DB connection lost')

    expect(hashService.hash).not.toHaveBeenCalled()
    expect(uow.runInTransaction).not.toHaveBeenCalled()
  })

  // ── UTCID10 — hashing fails before the transaction opens ──
  test('UTCID10: propagates a hashing failure and never opens the transaction', async () => {
    hashService.hash.mockRejectedValue(new Error('bcrypt unavailable'))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toThrow('bcrypt unavailable')

    expect(uow.runInTransaction).not.toHaveBeenCalled()
    expect(txUserRepo.create).not.toHaveBeenCalled()
  })

  // ── UTCID11 — the user insert fails inside the transaction ──
  test('UTCID11: aborts the registration when the user insert fails, signing no token', async () => {
    txUserRepo.create.mockRejectedValue(new Error('unique constraint violated'))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toThrow('unique constraint violated')

    // Nothing downstream of the insert ran.
    expect(txUserRepo.assignRole).not.toHaveBeenCalled()
    expect(txActivityRepo.create).not.toHaveBeenCalled()
    expect(tokenService.sign).not.toHaveBeenCalled()
    expect(txRefreshTokenRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID12 — the audit-trail write fails ──
  test('UTCID12: aborts the registration when the audit-trail write fails', async () => {
    txActivityRepo.create.mockRejectedValue(new Error('activity table locked'))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toThrow('activity table locked')

    // The user insert already ran, but the transaction as a whole fails,
    // so no refresh token is ever persisted.
    expect(txUserRepo.create).toHaveBeenCalledTimes(1)
    expect(txRefreshTokenRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID13 — persisting the refresh token fails ──
  test('UTCID13: propagates a refresh-token persistence failure', async () => {
    txRefreshTokenRepo.save.mockRejectedValue(new Error('refresh token insert failed'))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toThrow('refresh token insert failed')

    expect(txUserRepo.create).toHaveBeenCalledTimes(1)
    expect(tokenService.sign).toHaveBeenCalledTimes(1)
  })

  // ── UTCID14 — the transaction itself fails / rolls back ──
  test('UTCID14: propagates a transaction failure so nothing is committed', async () => {
    uow.runInTransaction.mockRejectedValue(new Error('transaction rolled back'))

    await expect(useCase.execute(VALID_INPUT as any)).rejects.toThrow('transaction rolled back')

    // The pre-flight work ran, but the transaction body never executed.
    expect(hashService.hash).toHaveBeenCalledTimes(1)
    expect(txUserRepo.create).not.toHaveBeenCalled()
  })
})
