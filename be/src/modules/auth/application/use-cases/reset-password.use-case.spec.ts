/**
 * Unit Tests — FO06 / ResetPassword  (ResetPasswordUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "ResetPassword"):
 *   UTCID01 (N) — Valid email + correct, unexpired OTP   → password reset, OTP cleared
 *   UTCID02 (N) — Success side-effects and ordering      → hash → change → clear OTP → save once
 *   UTCID03 (N) — OTP is single-use                      → replaying it after success is rejected
 *   UTCID04 (B) — New password at the 6-char minimum     → accepted
 *   UTCID05 (B) — Expiry EXACTLY equal to now            → accepted (comparison is strict >)
 *   UTCID06 (B) — Expiry 1 ms in the past                → rejected as expired
 *   UTCID07 (B) — New password identical to the old one  → allowed (no same-password guard)
 *   UTCID08 (A) — Email not registered                   → NotFoundError
 *   UTCID09 (A) — Account locked / inactive              → ValidationError (locked)
 *   UTCID10 (A) — No OTP stored (never asked / consumed) → ValidationError (invalid code)
 *   UTCID11 (A) — Wrong OTP                              → ValidationError (invalid code)
 *   UTCID12 (A) — Correct OTP but expiry is null         → ValidationError (expired)
 *   UTCID13 (A) — Correct OTP but already expired        → ValidationError (expired)
 *   UTCID14 (A) — Hash service failure                   → propagates, nothing saved, OTP intact
 *   UTCID15 (A) — Repository save failure                → propagates
 *
 * Requirement (FO06): ResetPasswordUseCase.execute completes a password reset only when the
 * account exists, is active, the supplied OTP matches the stored one, and that OTP has not
 * expired. The four guards are evaluated in that order. On success it hashes the new password,
 * replaces the stored hash, clears the OTP and its expiry (making the code single-use), and
 * persists the user in a single save.
 *
 * Note: a missing OTP and a wrong OTP fail with the SAME message, and a null expiry is treated
 * exactly like an elapsed one — both documented below as-built.
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { ResetPasswordUseCase } from './reset-password.use-case.js'
import { User, UserRoleType, UserStatusType } from '../../domain/entities/user.entity.js'
import { NotFoundError, ValidationError } from '../../../../shared/application/app.error.js'

const FIXED_NOW = new Date('2026-07-21T10:00:00.000Z')

// ── Test data builders ────────────────────────────────────────────
function makeUser(over: {
  id?: string
  email?: string | null
  passwordHash?: string | null
  status?: UserStatusType | null
  otp?: string | null
  otpExpiry?: Date | null
  roles?: UserRoleType[]
} = {}): User {
  const u = User.restore(
    over.id ?? 'user-1',
    over.email === undefined ? 'student@fpt.edu.vn' : over.email,
    over.passwordHash === undefined ? 'old-stored-hash' : over.passwordHash,
    'Test Student',
    null, null, null, null,
    over.status === undefined ? 'Active' : over.status,
    null,
    over.otp === undefined ? '123456' : over.otp,
    over.otpExpiry === undefined ? new Date(Date.now() + 10 * 60_000) : over.otpExpiry,
    over.roles ?? ['STUDENT'],
  )
  return u
}

const INPUT = (over: { email?: string; otp?: string; newPassword?: string } = {}) => ({
  dto: {
    email: over.email ?? 'student@fpt.edu.vn',
    otp: over.otp ?? '123456',
    newPassword: over.newPassword ?? 'BrandNew789',
  },
})

describe('FO06 / ResetPassword — ResetPasswordUseCase.execute', () => {
  let userRepo: {
    findByEmail: jest.Mock<(e: string) => Promise<User | null>>
    save: jest.Mock<(u: User) => Promise<void>>
  }
  let hashService: {
    hash: jest.Mock<(p: string) => Promise<string>>
    compare: jest.Mock<(p: string, h: string) => Promise<boolean>>
  }
  let useCase: ResetPasswordUseCase

  beforeEach(() => {
    userRepo = {
      findByEmail: jest.fn<(e: string) => Promise<User | null>>(),
      save: jest.fn<(u: User) => Promise<void>>().mockResolvedValue(undefined),
    }
    hashService = {
      hash: jest.fn<(p: string) => Promise<string>>().mockResolvedValue('new-stored-hash'),
      compare: jest.fn<(p: string, h: string) => Promise<boolean>>().mockResolvedValue(true),
    }
    useCase = new ResetPasswordUseCase(userRepo as any, hashService as any)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — happy path ──
  test('UTCID01: resets the password for a valid email with a correct, unexpired OTP', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)

    await expect(useCase.execute(INPUT() as any)).resolves.toBeUndefined()

    expect(userRepo.findByEmail).toHaveBeenCalledWith('student@fpt.edu.vn')
    expect(user.passwordHash).toBe('new-stored-hash')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID02 — side-effects and ordering ──
  test('UTCID02: hashes the new password, clears the OTP and persists in a single save', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)

    await useCase.execute(INPUT({ newPassword: 'Str0ngPass' }) as any)

    expect(hashService.hash).toHaveBeenCalledWith('Str0ngPass')
    // OTP and its expiry are both wiped so the code cannot be reused.
    expect(user.resetPasswordOtp).toBeNull()
    expect(user.resetPasswordOtpExpiry).toBeNull()
    // The saved instance IS the mutated aggregate, saved exactly once.
    const saved = userRepo.save.mock.calls[0][0]
    expect(saved).toBe(user)
    expect(saved.passwordHash).toBe('new-stored-hash')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID03 — the OTP is single-use ──
  test('UTCID03: rejects a replay of the same OTP after a successful reset', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)

    await useCase.execute(INPUT() as any)          // first use succeeds
    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: ValidationError,
      message: 'Mã xác thực không hợp lệ',
    })
    // Still only the one write from the first, successful reset.
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — new password exactly at the 6-character minimum ──
  test('UTCID04: accepts a new password of exactly 6 characters', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)

    await expect(useCase.execute(INPUT({ newPassword: 'Abc123' }) as any)).resolves.toBeUndefined()

    expect(hashService.hash).toHaveBeenCalledWith('Abc123')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID05 — expiry exactly equal to "now": NOT expired (strict >) ──
  test('UTCID05: accepts an OTP whose expiry is exactly the current instant', async () => {
    jest.useFakeTimers().setSystemTime(FIXED_NOW)
    const user = makeUser({ otpExpiry: new Date(FIXED_NOW.getTime()) })
    userRepo.findByEmail.mockResolvedValue(user)

    await expect(useCase.execute(INPUT() as any)).resolves.toBeUndefined()

    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID06 — expiry 1 ms earlier: the other side of the same boundary ──
  test('UTCID06: rejects an OTP that expired 1 millisecond ago', async () => {
    jest.useFakeTimers().setSystemTime(FIXED_NOW)
    const user = makeUser({ otpExpiry: new Date(FIXED_NOW.getTime() - 1) })
    userRepo.findByEmail.mockResolvedValue(user)

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: ValidationError,
      message: 'Mã xác thực đã hết hạn',
    })
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID07 — reusing the current password is not blocked ──
  test('UTCID07: allows the new password to be identical to the old one (no guard exists)', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)
    hashService.hash.mockResolvedValue('old-stored-hash')

    await expect(useCase.execute(INPUT({ newPassword: 'SamePass1' }) as any)).resolves.toBeUndefined()

    expect(user.passwordHash).toBe('old-stored-hash')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID08 — unknown email ──
  test('UTCID08: rejects an unregistered email with NotFoundError', async () => {
    userRepo.findByEmail.mockResolvedValue(null)

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: NotFoundError,
      message: 'Không tìm thấy tài khoản với email này',
    })
    expect(hashService.hash).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID09 — locked account, checked before the OTP ──
  test('UTCID09: rejects a locked account before the OTP is even examined', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ status: 'Inactive' }))

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: ValidationError,
      message: 'Tài khoản đã bị khoá hoặc chưa kích hoạt',
    })
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID10 — no OTP stored at all ──
  test('UTCID10: rejects when the account has no stored OTP', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ otp: null }))

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: ValidationError,
      message: 'Mã xác thực không hợp lệ',
    })
    expect(hashService.hash).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID11 — wrong OTP, same message as "no OTP" ──
  test('UTCID11: rejects a wrong OTP with the same message as a missing one', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ otp: '999999' }))

    await expect(useCase.execute(INPUT({ otp: '123456' }) as any)).rejects.toMatchObject({
      constructor: ValidationError,
      message: 'Mã xác thực không hợp lệ',
    })
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID12 — correct OTP but no expiry recorded ──
  test('UTCID12: treats a missing expiry as expired even when the OTP matches', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ otp: '123456', otpExpiry: null }))

    await expect(useCase.execute(INPUT({ otp: '123456' }) as any)).rejects.toMatchObject({
      constructor: ValidationError,
      message: 'Mã xác thực đã hết hạn',
    })
    expect(hashService.hash).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID13 — correct OTP, well past its expiry ──
  test('UTCID13: rejects a correct but expired OTP', async () => {
    userRepo.findByEmail.mockResolvedValue(
      makeUser({ otp: '123456', otpExpiry: new Date(Date.now() - 60_000) }),
    )

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: ValidationError,
      message: 'Mã xác thực đã hết hạn',
    })
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID14 — hashing fails: nothing is written, the OTP survives ──
  test('UTCID14: propagates a hash failure without saving or consuming the OTP', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)
    hashService.hash.mockRejectedValue(new Error('bcrypt unavailable'))

    await expect(useCase.execute(INPUT() as any)).rejects.toThrow('bcrypt unavailable')

    expect(userRepo.save).not.toHaveBeenCalled()
    // The reset can still be retried — the OTP was not cleared.
    expect(user.resetPasswordOtp).toBe('123456')
  })

  // ── UTCID15 — persistence fails ──
  test('UTCID15: propagates a repository save failure', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)
    userRepo.save.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute(INPUT() as any)).rejects.toThrow('DB connection lost')

    expect(hashService.hash).toHaveBeenCalledTimes(1)
  })
})
