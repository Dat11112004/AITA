/**
 * Unit Tests — FO05 / ForgotPassword  (ForgotPasswordUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "ForgotPassword"):
 *   UTCID01 (N) — Known, active email                    → OTP persisted and email sent
 *   UTCID02 (N) — Success side-effects                   → save before send, OTP inside the email
 *   UTCID03 (B) — OTP lower bound (Math.random = 0)      → '100000', exactly 6 digits
 *   UTCID04 (B) — OTP upper bound (Math.random → 1)      → '999999', exactly 6 digits
 *   UTCID05 (A) — Email not registered                   → NotFoundError, no write, no email
 *   UTCID06 (A) — Account inactive / locked              → ValidationError, no write, no email
 *   UTCID07 (A) — Mail transport fails                   → error propagates AFTER the OTP is saved
 *
 * Requirement (FO05): ForgotPasswordUseCase.execute issues a 6-digit OTP valid for 10 minutes
 * for a known, active account, persists it on the user and emails it. An unknown email fails
 * with NotFoundError and a locked account with ValidationError.
 *
 * ⚠️ Documented as-built, NOT as-desired: unlike LoginUseCase (which returns one generic
 * UnauthorizedError precisely so accounts cannot be enumerated), this use-case answers with
 * two DIFFERENT errors and so reveals whether an email is registered and whether it is
 * active. UTCID05/UTCID06 lock in the current behaviour; if the team closes the enumeration
 * gap, those two cases are the ones that must change.
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { ForgotPasswordUseCase } from './forgot-password.use-case.js'
import { User, UserRoleType, UserStatusType } from '../../domain/entities/user.entity.js'
import { NotFoundError, ValidationError } from '../../../../shared/application/app.error.js'

// ── Test data builders ────────────────────────────────────────────
function makeUser(over: {
  id?: string
  email?: string | null
  status?: UserStatusType | null
  roles?: UserRoleType[]
} = {}): User {
  return User.restore(
    over.id ?? 'user-1',
    over.email === undefined ? 'student@fpt.edu.vn' : over.email,
    'stored-hash',
    'Test Student',
    null, null, null, null,
    over.status === undefined ? 'Active' : over.status,
    null, null, null,
    over.roles ?? ['STUDENT'],
  )
}

const INPUT = { dto: { email: 'student@fpt.edu.vn' } }

describe('FO05 / ForgotPassword — ForgotPasswordUseCase.execute', () => {
  let userRepo: {
    findByEmail: jest.Mock<(e: string) => Promise<User | null>>
    save: jest.Mock<(u: User) => Promise<void>>
  }
  let emailService: {
    sendEmail: jest.Mock<(to: string | string[], s: string, h: string) => Promise<boolean>>
  }
  let useCase: ForgotPasswordUseCase

  beforeEach(() => {
    userRepo = {
      findByEmail: jest.fn<(e: string) => Promise<User | null>>(),
      save: jest.fn<(u: User) => Promise<void>>().mockResolvedValue(undefined),
    }
    emailService = {
      sendEmail: jest
        .fn<(to: string | string[], s: string, h: string) => Promise<boolean>>()
        .mockResolvedValue(true),
    }
    useCase = new ForgotPasswordUseCase(userRepo as any, emailService as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ── UTCID01 (Normal) — happy path ──
  test('UTCID01: issues a 6-digit OTP and emails it for a known, active account', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)

    await expect(useCase.execute(INPUT as any)).resolves.toBeUndefined()

    expect(userRepo.findByEmail).toHaveBeenCalledWith('student@fpt.edu.vn')
    expect(user.resetPasswordOtp).toMatch(/^\d{6}$/)
    expect(userRepo.save).toHaveBeenCalledTimes(1)
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1)
  })

  // ── UTCID02 (Normal) — side-effects: 10-minute expiry, OTP embedded, save before send ──
  test('UTCID02: sets a 10-minute expiry, saves before sending, and embeds the OTP in the email', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)
    const callOrder: string[] = []
    userRepo.save.mockImplementation(async () => { callOrder.push('save') })
    emailService.sendEmail.mockImplementation(async () => { callOrder.push('send'); return true })

    await useCase.execute(INPUT as any)

    // The OTP must be persisted BEFORE the mail goes out.
    expect(callOrder).toEqual(['save', 'send'])

    // Expiry ~10 minutes ahead.
    const minutesAhead = (user.resetPasswordOtpExpiry!.getTime() - Date.now()) / 60_000
    expect(minutesAhead).toBeGreaterThan(9.5)
    expect(minutesAhead).toBeLessThan(10.5)

    // Mail addressed to the requester, and the OTP actually appears in the body.
    const [to, subject, html] = emailService.sendEmail.mock.calls[0]
    expect(to).toBe('student@fpt.edu.vn')
    expect(subject).toContain('AITA')
    expect(html).toContain(user.resetPasswordOtp!)
  })

  // ── UTCID03 (Boundary) — OTP lower bound ──
  test('UTCID03: produces the lowest 6-digit OTP (100000) at the bottom of the range', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)
    jest.spyOn(Math, 'random').mockReturnValue(0)

    await useCase.execute(INPUT as any)

    expect(user.resetPasswordOtp).toBe('100000')
    expect(user.resetPasswordOtp).toHaveLength(6)
  })

  // ── UTCID04 (Boundary) — OTP upper bound ──
  test('UTCID04: produces the highest 6-digit OTP (999999) at the top of the range', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)
    // Math.random() is [0,1); the largest representable value below 1.
    jest.spyOn(Math, 'random').mockReturnValue(0.9999999999999999)

    await useCase.execute(INPUT as any)

    expect(user.resetPasswordOtp).toBe('999999')
    expect(user.resetPasswordOtp).toHaveLength(6)
  })

  // ── UTCID05 (Abnormal) — unknown email ──
  test('UTCID05: rejects an unregistered email with NotFoundError and sends nothing', async () => {
    userRepo.findByEmail.mockResolvedValue(null)

    await expect(useCase.execute(INPUT as any)).rejects.toMatchObject({
      constructor: NotFoundError,
      message: 'Không tìm thấy tài khoản với email này',
    })
    expect(userRepo.save).not.toHaveBeenCalled()
    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })

  // ── UTCID06 (Abnormal) — locked / inactive account ──
  test('UTCID06: rejects an inactive account with ValidationError and sends nothing', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ status: 'Inactive' }))

    await expect(useCase.execute(INPUT as any)).rejects.toMatchObject({
      constructor: ValidationError,
      message: 'Tài khoản đã bị khoá hoặc chưa kích hoạt',
    })
    expect(userRepo.save).not.toHaveBeenCalled()
    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })

  // ── UTCID07 (Abnormal) — mail transport failure after the OTP was persisted ──
  test('UTCID07: propagates a mail failure, leaving the OTP already persisted', async () => {
    const user = makeUser()
    userRepo.findByEmail.mockResolvedValue(user)
    emailService.sendEmail.mockRejectedValue(new Error('SMTP unavailable'))

    await expect(useCase.execute(INPUT as any)).rejects.toThrow('SMTP unavailable')

    // No rollback exists: the user keeps an OTP that was never delivered.
    expect(userRepo.save).toHaveBeenCalledTimes(1)
    expect(user.resetPasswordOtp).toMatch(/^\d{6}$/)
  })
})
