/**
 * Unit Tests — FO04 / ChangePassword  (ChangePasswordUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "ChangePassword"):
 *   UTCID01 (N) — Active user, correct old password      → password re-hashed and saved
 *   UTCID02 (N) — Success side-effects                   → hash(new), save(user), flag cleared
 *   UTCID03 (B) — New password at the 6-char minimum     → accepted at use-case level
 *   UTCID04 (B) — New password identical to the old one  → ALLOWED (no same-password guard)
 *   UTCID05 (A) — User not found (findById → null)       → NotFoundError, no writes
 *   UTCID06 (A) — User exists but inactive               → NotFoundError (same as missing)
 *   UTCID07 (A) — User has no stored password hash       → UnauthorizedError, no writes
 *   UTCID08 (A) — Wrong old password                     → UnauthorizedError + warning, no writes
 *
 * Requirement (FO04): ChangePasswordUseCase.execute changes a user's password only when the
 * account is active AND the supplied old password matches the stored hash. A missing or
 * inactive account fails with the SAME NotFoundError so account state cannot be probed; a
 * missing hash or a wrong old password fails with the SAME UnauthorizedError. On success it
 * hashes the new password via IHashService, persists the user, and clears the
 * require-password-change flag set by the student-import flow.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { ChangePasswordUseCase } from './change-password.use-case.js'
import { User, UserRoleType, UserStatusType } from '../../domain/entities/user.entity.js'
import { UnauthorizedError, NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

// ── Test data builders ────────────────────────────────────────────
function makeUser(over: {
  id?: string
  email?: string | null
  passwordHash?: string | null
  status?: UserStatusType | null
  roles?: UserRoleType[]
} = {}): User {
  return User.restore(
    over.id ?? 'user-1',
    over.email === undefined ? 'student@fpt.edu.vn' : over.email,
    over.passwordHash === undefined ? 'stored-old-hash' : over.passwordHash,
    'Test Student',
    null, null, null, null,
    over.status === undefined ? 'Active' : over.status,
    null, null, null,
    over.roles ?? ['STUDENT'],
  )
}

const INPUT = (over: { oldPassword?: string; newPassword?: string } = {}) => ({
  userId: 'user-1',
  dto: {
    oldPassword: over.oldPassword ?? 'OldPass123',
    newPassword: over.newPassword ?? 'NewPass456',
  },
})

describe('FO04 / ChangePassword — ChangePasswordUseCase.execute', () => {
  let userRepo: {
    findById: jest.Mock<(id: string) => Promise<User | null>>
    save: jest.Mock<(u: User) => Promise<void>>
    setRequirePasswordChange: jest.Mock<(id: string, v: boolean) => Promise<void>>
  }
  let hashService: {
    compare: jest.Mock<(plain: string, hash: string) => Promise<boolean>>
    hash: jest.Mock<(plain: string) => Promise<string>>
  }
  let logger: {
    info: jest.Mock<(m: string) => void>
    warn: jest.Mock<(m: string) => void>
    debug: jest.Mock<(m: string) => void>
    error: jest.Mock<(m: string) => void>
    createChild: jest.Mock<() => unknown>
  }
  let useCase: ChangePasswordUseCase

  beforeEach(() => {
    userRepo = {
      findById: jest.fn<(id: string) => Promise<User | null>>(),
      save: jest.fn<(u: User) => Promise<void>>().mockResolvedValue(undefined),
      setRequirePasswordChange: jest
        .fn<(id: string, v: boolean) => Promise<void>>()
        .mockResolvedValue(undefined),
    }
    hashService = {
      compare: jest.fn<(p: string, h: string) => Promise<boolean>>().mockResolvedValue(true),
      hash: jest.fn<(p: string) => Promise<string>>().mockResolvedValue('new-hash'),
    }
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      createChild: jest.fn(),
    }
    useCase = new ChangePasswordUseCase(userRepo as any, hashService as any, logger as any)
  })

  // ── UTCID01 (Normal) — happy path ──
  test('UTCID01: changes the password for an active user with the correct old password', async () => {
    const user = makeUser()
    userRepo.findById.mockResolvedValue(user)

    await expect(useCase.execute(INPUT() as any)).resolves.toBeUndefined()

    expect(hashService.compare).toHaveBeenCalledWith('OldPass123', 'stored-old-hash')
    expect(user.passwordHash).toBe('new-hash')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith('Password successfully changed for user user-1')
    expect(logger.warn).not.toHaveBeenCalled()
  })

  // ── UTCID02 (Normal) — side-effects: hash new, save user, clear forced-change flag ──
  test('UTCID02: hashes the new password, saves the user and clears the require-change flag', async () => {
    const user = makeUser()
    userRepo.findById.mockResolvedValue(user)

    await useCase.execute(INPUT({ newPassword: 'BrandNew789' }) as any)

    expect(hashService.hash).toHaveBeenCalledWith('BrandNew789')
    // The persisted instance IS the mutated user carrying the new hash.
    const saved = userRepo.save.mock.calls[0][0]
    expect(saved).toBe(user)
    expect(saved.passwordHash).toBe('new-hash')
    // Self-service change clears the forced-change flag from the student-import flow.
    expect(userRepo.setRequirePasswordChange).toHaveBeenCalledWith('user-1', false)
  })

  // ── UTCID03 (Boundary) — new password exactly at the 6-char minimum ──
  test('UTCID03: accepts a new password at the 6-character minimum', async () => {
    const user = makeUser()
    userRepo.findById.mockResolvedValue(user)

    await expect(useCase.execute(INPUT({ newPassword: 'Abc123' }) as any)).resolves.toBeUndefined()

    expect(hashService.hash).toHaveBeenCalledWith('Abc123')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID04 (Boundary) — new password identical to old: no guard exists ──
  test('UTCID04: allows reusing the same password (the use-case has no same-password guard)', async () => {
    const user = makeUser()
    userRepo.findById.mockResolvedValue(user)

    await expect(
      useCase.execute(INPUT({ oldPassword: 'SamePass1', newPassword: 'SamePass1' }) as any),
    ).resolves.toBeUndefined()

    expect(hashService.hash).toHaveBeenCalledWith('SamePass1')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID05 (Abnormal) — unknown user ──
  test('UTCID05: rejects an unknown user with NotFoundError and writes nothing', async () => {
    userRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: NotFoundError,
      message: MESSAGES.USER_NOT_FOUND,
    })
    expect(hashService.compare).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
    expect(userRepo.setRequirePasswordChange).not.toHaveBeenCalled()
  })

  // ── UTCID06 (Abnormal) — inactive user fails identically to a missing one ──
  test('UTCID06: rejects an inactive user with the same NotFoundError', async () => {
    userRepo.findById.mockResolvedValue(makeUser({ status: 'Inactive' }))

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: NotFoundError,
      message: MESSAGES.USER_NOT_FOUND,
    })
    expect(hashService.compare).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID07 (Abnormal) — account without a stored hash ──
  test('UTCID07: rejects a user with no stored password hash without calling compare', async () => {
    userRepo.findById.mockResolvedValue(makeUser({ passwordHash: null }))

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: UnauthorizedError,
      message: MESSAGES.AUTH_WRONG_OLD_PASSWORD,
    })
    // Short-circuit: `!user.passwordHash` is checked before compare() runs.
    expect(hashService.compare).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID08 (Abnormal) — wrong old password ──
  test('UTCID08: rejects a wrong old password with UnauthorizedError and logs a warning', async () => {
    userRepo.findById.mockResolvedValue(makeUser())
    hashService.compare.mockResolvedValue(false)

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: UnauthorizedError,
      message: MESSAGES.AUTH_WRONG_OLD_PASSWORD,
    })
    expect(logger.warn).toHaveBeenCalledWith(
      'Change password failed: Wrong old password for user user-1',
    )
    expect(hashService.hash).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
    expect(userRepo.setRequirePasswordChange).not.toHaveBeenCalled()
  })
})
