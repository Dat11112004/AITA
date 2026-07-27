/**
 * Unit Tests — FO19 / EnrollStudent  (EnrollStudentUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "EnrollStudent"):
 *   UTCID01 (N) — ADMIN enrols an active student   → StudentClass row created for the pair
 *   UTCID02 (N) — The class instructor enrols      → allowed without the ADMIN role
 *   UTCID03 (N) — Return value                     → the repository row is returned unmapped
 *   UTCID04 (B) — ADMIN who is not the instructor  → still allowed
 *   UTCID05 (B) — Instructor whose role is LECTURER → allowed on the instructor check alone
 *   UTCID06 (B) — Duplicate check returns []       → treated as "not enrolled", proceeds
 *   UTCID07 (B) — Duplicate check returns null     → guard tolerates it, proceeds
 *   UTCID08 (B) — Status casing                    → 'Active' passes, 'active' is rejected
 *   UTCID09 (B) — Role casing                      → 'ADMIN' passes, 'admin' is rejected
 *   UTCID10 (A) — Class id unknown                 → NotFoundError, nothing else queried
 *   UTCID11 (A) — Neither admin nor instructor     → ForbiddenError, student never looked up
 *   UTCID12 (A) — Student id unknown               → NotFoundError
 *   UTCID13 (A) — Student not active               → ValidationError, no enrolment written
 *   UTCID14 (A) — Student already enrolled         → ConflictError, create never called
 *   UTCID15 (A) — Insert fails                     → propagates
 *
 * Requirement (FO19): EnrollStudentUseCase.execute loads the class and rejects an unknown id, then
 * authorises the caller — only an ADMIN or the class's own instructor may enrol — before checking
 * that the student exists and is Active. It refuses a duplicate enrolment with a ConflictError and
 * otherwise creates the StudentClass row, returning the repository result unchanged.
 *
 * As-built notes captured by these cases (behaviour is documented, NOT corrected):
 *   - Both the role and the student status are compared with exact, case-sensitive string equality
 *     ('ADMIN', 'Active'), so any casing drift in the token or the database silently denies the
 *     request — UTCID08/09.
 *   - The two repositories are resolved with `Symbol.for('UserRepository')` /
 *     `Symbol.for('EnrollmentRepository')` instead of the shared TOKENS constants. It resolves to
 *     the same symbols today because TOKENS is built from Symbol.for, so this is a consistency
 *     smell rather than a defect.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { EnrollStudentUseCase } from './enroll-student.use-case.js'
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'

const CLASS_ID = 'class-1'
const STUDENT_ID = 'user-student'
const INSTRUCTOR_ID = 'user-lecturer'

const PARAMS = (over: Partial<{ classId: string; studentId: string; user: { id: string; role: string } }> = {}) => ({
  classId: over.classId ?? CLASS_ID,
  dto: { data: { studentId: over.studentId ?? STUDENT_ID } },
  user: over.user ?? { id: 'user-admin', role: 'ADMIN' },
})

describe('FO19 / EnrollStudent — EnrollStudentUseCase.execute', () => {
  let classRepo: { findById: jest.Mock<(id: string) => Promise<any>> }
  let userRepo: { findById: jest.Mock<(id: string) => Promise<any>> }
  let enrollmentRepo: {
    findMany: jest.Mock<(where?: any) => Promise<any[]>>
    create: jest.Mock<(data: any) => Promise<any>>
  }
  let uow: { resolve: jest.Mock }
  let useCase: EnrollStudentUseCase

  beforeEach(() => {
    classRepo = {
      findById: jest
        .fn<(id: string) => Promise<any>>()
        .mockResolvedValue({ id: CLASS_ID, classCode: 'SE1801', instructorId: INSTRUCTOR_ID }),
    }
    userRepo = {
      findById: jest.fn<(id: string) => Promise<any>>().mockResolvedValue({ id: STUDENT_ID, status: 'Active' }),
    }
    enrollmentRepo = {
      findMany: jest.fn<(where?: any) => Promise<any[]>>().mockResolvedValue([]),
      create: jest
        .fn<(data: any) => Promise<any>>()
        .mockResolvedValue({ UserId: STUDENT_ID, ClassId: CLASS_ID, EnrolledAt: new Date('2026-07-22T00:00:00.000Z') }),
    }
    uow = {
      resolve: jest.fn((token: symbol) => {
        if (token === TOKENS.UserRepository) return userRepo
        if (token === TOKENS.EnrollmentRepository) return enrollmentRepo
        throw new Error(`Unexpected token: ${String(token)}`)
      }),
    }
    useCase = new EnrollStudentUseCase(classRepo as any, uow as any)
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — admin enrols ──
  test('UTCID01: lets an ADMIN enrol an active student into the class', async () => {
    await useCase.execute(PARAMS() as any)

    expect(classRepo.findById).toHaveBeenCalledWith(CLASS_ID)
    expect(userRepo.findById).toHaveBeenCalledWith(STUDENT_ID)
    expect(enrollmentRepo.findMany).toHaveBeenCalledWith({ ClassId: CLASS_ID, UserId: STUDENT_ID })
    expect(enrollmentRepo.create).toHaveBeenCalledWith({ ClassId: CLASS_ID, UserId: STUDENT_ID })
  })

  // ── UTCID02 — the class instructor enrols ──
  test('UTCID02: lets the class instructor enrol without the ADMIN role', async () => {
    await useCase.execute(PARAMS({ user: { id: INSTRUCTOR_ID, role: 'LECTURER' } }) as any)

    expect(enrollmentRepo.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID03 — the repository row is passed straight through ──
  test('UTCID03: returns the repository result without mapping it to a DTO', async () => {
    const row = { UserId: STUDENT_ID, ClassId: CLASS_ID, EnrolledAt: new Date('2026-07-22T00:00:00.000Z') }
    enrollmentRepo.create.mockResolvedValue(row)

    const result = await useCase.execute(PARAMS() as any)

    expect(result).toBe(row)
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — admin unrelated to the class ──
  test('UTCID04: allows an ADMIN who is not the instructor of that class', async () => {
    classRepo.findById.mockResolvedValue({ id: CLASS_ID, instructorId: 'someone-else' })

    await useCase.execute(PARAMS({ user: { id: 'user-admin', role: 'ADMIN' } }) as any)

    expect(enrollmentRepo.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID05 — instructor identity alone is enough ──
  test('UTCID05: allows the instructor purely on the id match, whatever the role string is', async () => {
    await useCase.execute(PARAMS({ user: { id: INSTRUCTOR_ID, role: 'SOMETHING_ELSE' } }) as any)

    expect(enrollmentRepo.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID06 — empty duplicate result ──
  test('UTCID06: treats an empty duplicate-check result as "not yet enrolled"', async () => {
    enrollmentRepo.findMany.mockResolvedValue([])

    await useCase.execute(PARAMS() as any)

    expect(enrollmentRepo.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID07 — nullish duplicate result ──
  test('UTCID07: tolerates a nullish duplicate-check result and still enrols', async () => {
    enrollmentRepo.findMany.mockResolvedValue(null as any)

    await useCase.execute(PARAMS() as any)

    expect(enrollmentRepo.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID08 — the status comparison is case-sensitive ──
  test('UTCID08: accepts status "Active" but rejects the same word in lower case', async () => {
    userRepo.findById.mockResolvedValue({ id: STUDENT_ID, status: 'Active' })
    await expect(useCase.execute(PARAMS() as any)).resolves.toBeDefined()

    userRepo.findById.mockResolvedValue({ id: STUDENT_ID, status: 'active' })
    await expect(useCase.execute(PARAMS() as any)).rejects.toMatchObject({
      constructor: ValidationError,
      message: MESSAGES.CLASS_STUDENT_INACTIVE,
    })
  })

  // ── UTCID09 — the role comparison is case-sensitive ──
  test('UTCID09: accepts role "ADMIN" but rejects "admin" for a non-instructor', async () => {
    await expect(useCase.execute(PARAMS({ user: { id: 'u', role: 'ADMIN' } }) as any)).resolves.toBeDefined()

    await expect(useCase.execute(PARAMS({ user: { id: 'u', role: 'admin' } }) as any)).rejects.toMatchObject({
      constructor: ForbiddenError,
      message: MESSAGES.CLASS_FORBIDDEN_ENROLL,
    })
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID10 — unknown class ──
  test('UTCID10: rejects an unknown class before any other lookup', async () => {
    classRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(PARAMS({ classId: 'class-missing' }) as any)).rejects.toMatchObject({
      constructor: NotFoundError,
      message: MESSAGES.CLASS_NOT_FOUND,
    })

    expect(uow.resolve).not.toHaveBeenCalled()
    expect(enrollmentRepo.create).not.toHaveBeenCalled()
  })

  // ── UTCID11 — caller is neither admin nor the instructor ──
  test('UTCID11: forbids a lecturer who does not teach the class', async () => {
    await expect(
      useCase.execute(PARAMS({ user: { id: 'other-lecturer', role: 'LECTURER' } }) as any),
    ).rejects.toMatchObject({
      constructor: ForbiddenError,
      message: MESSAGES.CLASS_FORBIDDEN_ENROLL,
    })

    // The student is never even looked up.
    expect(userRepo.findById).not.toHaveBeenCalled()
    expect(enrollmentRepo.create).not.toHaveBeenCalled()
  })

  // ── UTCID12 — unknown student ──
  test('UTCID12: rejects an unknown student id', async () => {
    userRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(PARAMS({ studentId: 'user-missing' }) as any)).rejects.toMatchObject({
      constructor: NotFoundError,
      message: MESSAGES.USER_NOT_FOUND,
    })

    expect(enrollmentRepo.create).not.toHaveBeenCalled()
  })

  // ── UTCID13 — inactive student ──
  test('UTCID13: refuses to enrol a student whose account is not active', async () => {
    userRepo.findById.mockResolvedValue({ id: STUDENT_ID, status: 'Inactive' })

    await expect(useCase.execute(PARAMS() as any)).rejects.toMatchObject({
      constructor: ValidationError,
      message: MESSAGES.CLASS_STUDENT_INACTIVE,
    })

    expect(enrollmentRepo.findMany).not.toHaveBeenCalled()
    expect(enrollmentRepo.create).not.toHaveBeenCalled()
  })

  // ── UTCID14 — already on the roster ──
  test('UTCID14: rejects a duplicate enrolment with a ConflictError', async () => {
    enrollmentRepo.findMany.mockResolvedValue([{ UserId: STUDENT_ID, ClassId: CLASS_ID } as any])

    await expect(useCase.execute(PARAMS() as any)).rejects.toMatchObject({
      constructor: ConflictError,
      message: MESSAGES.CLASS_STUDENT_ALREADY_ENROLLED,
    })

    expect(enrollmentRepo.create).not.toHaveBeenCalled()
  })

  // ── UTCID15 — the insert fails ──
  test('UTCID15: propagates a failure from the enrolment insert', async () => {
    enrollmentRepo.create.mockRejectedValue(new Error('FK constraint violated'))

    await expect(useCase.execute(PARAMS() as any)).rejects.toThrow('FK constraint violated')
  })
})
