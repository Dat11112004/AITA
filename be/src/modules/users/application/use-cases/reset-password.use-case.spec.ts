/**
 * Unit Tests — FO11 / AdminResetPassword  (users ResetPasswordUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "AdminResetPassword"):
 *   UTCID01 (N) — User with an email address     → password reset, saved, email sent
 *   UTCID02 (N) — Ordering of side-effects       → hash → change → save → email
 *   UTCID03 (N) — Email content                  → carries the new password, correct subject
 *   UTCID04 (B) — Generated password format      → exactly 8 lower-case hex characters
 *   UTCID05 (B) — Generated password uniqueness  → a different password on every reset
 *   UTCID06 (B) — Account with NO email address  → password still reset, NO email sent
 *   UTCID07 (B) — Account with no full name      → greeting falls back to the email address
 *   UTCID08 (A) — User not found                 → AppError NOT_FOUND (404), nothing changed
 *   UTCID09 (A) — Lookup failure                 → propagates, nothing hashed or saved
 *   UTCID10 (A) — Hashing failure                → propagates, nothing saved
 *   UTCID11 (A) — Save failure                   → propagates, no email sent
 *   UTCID12 (A) — Mail transport failure         → propagates AFTER the password was changed
 *
 * Requirement (FO11): the admin-driven ResetPasswordUseCase.execute loads the user by id and
 * fails with a 404 AppError when absent. Otherwise it generates an 8-character hex password
 * (crypto.randomBytes(4)), hashes it, replaces the stored hash, persists the user, and — only
 * when the account has an email address — mails the plain-text password to that address.
 *
 * ⚠️ As-built behaviours locked in below, worth review:
 *  - UTCID06: an account without an email has its password reset with NO way to learn the new
 *    one, and the use-case reports success.
 *  - UTCID12: the save happens BEFORE the mail, and there is no rollback — if the mail fails
 *    the old password is already gone and the new one was never delivered.
 *  - The use-case does NOT set requirePasswordChange, even though the email tells the user to
 *    change the password at first login (contrast with the student-import flow, which sets it).
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { ResetPasswordUseCase } from './reset-password.use-case.js'
import { User, UserRoleType, UserStatusType } from '../../../auth/domain/entities/user.entity.js'
import { AppError } from '../../../../shared/application/app.error.js'

function makeUser(over: {
  id?: string
  email?: string | null
  fullName?: string | null
  status?: UserStatusType | null
  roles?: UserRoleType[]
} = {}): User {
  return User.restore(
    over.id ?? 'user-1',
    over.email === undefined ? 'student@fpt.edu.vn' : over.email,
    'old-stored-hash',
    over.fullName === undefined ? 'Test Student' : over.fullName,
    null, null, null, null,
    over.status === undefined ? 'Active' : over.status,
    null, null, null,
    over.roles ?? ['STUDENT'],
  )
}

describe('FO11 / AdminResetPassword — ResetPasswordUseCase.execute', () => {
  let userRepo: {
    findById: jest.Mock<(id: string) => Promise<User | null>>
    save: jest.Mock<(u: User) => Promise<void>>
  }
  let hashService: { hash: jest.Mock<(p: string) => Promise<string>> }
  let emailService: {
    sendEmail: jest.Mock<(to: string | string[], s: string, h: string) => Promise<boolean>>
  }
  let logger: {
    info: jest.Mock<(m: string) => void>
    warn: jest.Mock<(m: string) => void>
    debug: jest.Mock<(m: string) => void>
    error: jest.Mock<(m: string) => void>
    createChild: jest.Mock<() => unknown>
  }
  let useCase: ResetPasswordUseCase

  beforeEach(() => {
    userRepo = {
      findById: jest.fn<(id: string) => Promise<User | null>>(),
      save: jest.fn<(u: User) => Promise<void>>().mockResolvedValue(undefined),
    }
    hashService = { hash: jest.fn<(p: string) => Promise<string>>().mockResolvedValue('new-stored-hash') }
    emailService = {
      sendEmail: jest
        .fn<(to: string | string[], s: string, h: string) => Promise<boolean>>()
        .mockResolvedValue(true),
    }
    logger = {
      info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn(), createChild: jest.fn(),
    }
    useCase = new ResetPasswordUseCase(
      userRepo as any, hashService as any, emailService as any, logger as any,
    )
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — happy path ──
  test('UTCID01: resets the password, persists it and emails the account', async () => {
    const user = makeUser()
    userRepo.findById.mockResolvedValue(user)

    await expect(useCase.execute('user-1')).resolves.toBeUndefined()

    expect(user.passwordHash).toBe('new-stored-hash')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith('Admin reset password for user user-1')
  })

  // ── UTCID02 — ordering: the stored hash comes from the generated password ──
  test('UTCID02: hashes the generated password, saves the user, then sends the mail', async () => {
    const user = makeUser()
    userRepo.findById.mockResolvedValue(user)
    const order: string[] = []
    userRepo.save.mockImplementation(async () => { order.push('save') })
    emailService.sendEmail.mockImplementation(async () => { order.push('mail'); return true })

    await useCase.execute('user-1')

    // The password put in the mail is exactly the one that was hashed.
    const hashed = hashService.hash.mock.calls[0][0]
    const html = emailService.sendEmail.mock.calls[0][2]
    expect(html).toContain(hashed)
    // Persisted before the mail goes out.
    expect(order).toEqual(['save', 'mail'])
    expect(userRepo.save.mock.calls[0][0]).toBe(user)
  })

  // ── UTCID03 — mail is addressed and titled correctly ──
  test('UTCID03: sends the new password to the account address with the AITA subject', async () => {
    const user = makeUser({ email: 'someone@fpt.edu.vn', fullName: 'Someone' })
    userRepo.findById.mockResolvedValue(user)

    await useCase.execute('user-1')

    const [to, subject, html] = emailService.sendEmail.mock.calls[0]
    expect(to).toBe('someone@fpt.edu.vn')
    expect(subject).toBe('Khôi phục mật khẩu tài khoản AITA')
    expect(html).toContain('Someone')
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — generated password is 8 hex characters ──
  test('UTCID04: generates an 8-character lower-case hex password', async () => {
    userRepo.findById.mockResolvedValue(makeUser())

    await useCase.execute('user-1')

    const raw = hashService.hash.mock.calls[0][0]
    expect(raw).toMatch(/^[0-9a-f]{8}$/)   // randomBytes(4).toString('hex')
    expect(raw).toHaveLength(8)
  })

  // ── UTCID05 — a fresh password on every reset ──
  test('UTCID05: generates a different password on each reset', async () => {
    userRepo.findById.mockResolvedValue(makeUser())

    await useCase.execute('user-1')
    await useCase.execute('user-1')

    const [first] = hashService.hash.mock.calls[0]
    const [second] = hashService.hash.mock.calls[1]
    expect(first).not.toBe(second)
  })

  // ── UTCID06 — account with no email: reset happens, nobody is told ──
  test('UTCID06: still resets the password when the account has no email, sending nothing', async () => {
    const user = makeUser({ email: null })
    userRepo.findById.mockResolvedValue(user)

    await expect(useCase.execute('user-1')).resolves.toBeUndefined()

    // Password is gone but no message can reach the user.
    expect(user.passwordHash).toBe('new-stored-hash')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })

  // ── UTCID07 — greeting falls back to the email address ──
  test('UTCID07: greets by email address when the account has no full name', async () => {
    userRepo.findById.mockResolvedValue(makeUser({ fullName: null, email: 'noname@fpt.edu.vn' }))

    await useCase.execute('user-1')

    expect(emailService.sendEmail.mock.calls[0][2]).toContain('noname@fpt.edu.vn')
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID08 — unknown user ──
  test('UTCID08: rejects an unknown user with a 404 AppError and changes nothing', async () => {
    userRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute('missing')).rejects.toMatchObject({
      constructor: AppError,
      code: 'NOT_FOUND',
      statusCode: 404,
      message: 'Không tìm thấy người dùng',
    })
    expect(hashService.hash).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })

  // ── UTCID09 — lookup failure ──
  test('UTCID09: propagates a lookup failure without hashing or saving', async () => {
    userRepo.findById.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute('user-1')).rejects.toThrow('DB connection lost')

    expect(hashService.hash).not.toHaveBeenCalled()
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID10 — hashing failure ──
  test('UTCID10: propagates a hashing failure without saving', async () => {
    const user = makeUser()
    userRepo.findById.mockResolvedValue(user)
    hashService.hash.mockRejectedValue(new Error('bcrypt unavailable'))

    await expect(useCase.execute('user-1')).rejects.toThrow('bcrypt unavailable')

    expect(userRepo.save).not.toHaveBeenCalled()
    expect(user.passwordHash).toBe('old-stored-hash')   // untouched
    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })

  // ── UTCID11 — save failure ──
  test('UTCID11: propagates a save failure and sends no mail', async () => {
    userRepo.findById.mockResolvedValue(makeUser())
    userRepo.save.mockRejectedValue(new Error('DB write failed'))

    await expect(useCase.execute('user-1')).rejects.toThrow('DB write failed')

    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })

  // ── UTCID12 — mail failure AFTER the password was already replaced ──
  test('UTCID12: propagates a mail failure, leaving the password already changed and undelivered', async () => {
    const user = makeUser()
    userRepo.findById.mockResolvedValue(user)
    emailService.sendEmail.mockRejectedValue(new Error('SMTP unavailable'))

    await expect(useCase.execute('user-1')).rejects.toThrow('SMTP unavailable')

    // No rollback: the old password no longer works and the new one never arrived.
    expect(user.passwordHash).toBe('new-stored-hash')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })
})
