/**
 * Unit Tests — FO18 / CreateClass  (CreateClassUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "CreateClass"):
 *   UTCID01 (N) — All references valid, no lecturer → class created in a transaction, DTO returned
 *   UTCID02 (N) — Lecturer supplied                → validated first, assigned inside the transaction
 *   UTCID03 (N) — Entity built from the request    → generated id, status Active, ClassCreatedEvent
 *   UTCID04 (N) — Matching pending enrolments      → students enrolled, specific rows marked Enrolled
 *   UTCID05 (B) — Semester-wide pending row        → student enrolled but the row stays Pending
 *   UTCID06 (B) — Semester matched by number       → "Ky 1" matches semester code "Kỳ 1"
 *   UTCID07 (B) — Subject code case-insensitive    → "prf192" matches subject "PRF192"
 *   UTCID08 (B) — Student already enrolled         → no duplicate StudentClass row written
 *   UTCID09 (B) — Season on both sides matches     → pending row is kept
 *   UTCID10 (B) — Pending has season, class none   → pending row is excluded
 *   UTCID11 (B) — Season string unparseable        → pending row is excluded
 *   UTCID12 (B) — No lecturerId                    → lecturer never looked up nor assigned
 *   UTCID13 (A) — semesterId missing               → raw Error, nothing looked up
 *   UTCID14 (A) — subjectId missing                → raw Error, nothing looked up
 *   UTCID15 (A) — Class code already used          → ConflictError before any write
 *   UTCID16 (A) — Subject id unknown               → NotFoundError
 *   UTCID17 (A) — Semester id unknown              → NotFoundError
 *   UTCID18 (A) — Lecturer id unknown              → NotFoundError, transaction never opened
 *   UTCID19 (A) — Transaction fails                → propagates, auto-enrolment never runs
 *   UTCID20 (A) — Auto-enrolment fails             → swallowed, the class is still returned
 *   UTCID21 (A) — Final re-read returns null       → raw TypeError after the class was committed
 *
 * Requirement (FO18): CreateClassUseCase.execute validates the request against four references —
 * the code+semester+subject triple must be free, and the subject, the semester and (when supplied)
 * the lecturer must exist — then creates the Class inside a Unit-of-Work transaction, assigning the
 * instructor in the same transaction. Afterwards it runs a best-effort auto-enrolment pass that
 * picks up PendingEnrollment rows for this class code whose semester, subject and season match,
 * enrols those students, and marks only the subject-specific rows as Enrolled (semester-wide rows
 * stay Pending so later classes can pick them up too). Finally it re-reads the class so the
 * response carries an up-to-date studentCount.
 *
 * As-built notes captured by these cases (behaviour is documented, NOT corrected):
 *   - The whole auto-enrolment block is wrapped in a catch-all that only console.errors, so a
 *     failure there is invisible to the caller — the class is returned as if all went well (UTCID20).
 *   - A missing semesterId/subjectId throws a bare `Error`, so the API reports 500 rather than 400
 *     (UTCID13/14).
 *   - The response is mapped from a re-read; if that read returns null the use-case dereferences
 *     null and throws a raw TypeError after the class has already been committed (UTCID21) — the
 *     same shape logged for FO14 CreateSemester.
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'

// The auto-enrolment block pulls the shared Prisma client in with a dynamic import,
// so it has to be mocked before the use-case module is loaded.
const prisma: any = {}
jest.unstable_mockModule('../../../../database/prisma.js', () => ({ prisma }))

const { CreateClassUseCase } = await import('./create-class.use-case.js')
const { Class, ClassCreatedEvent } = await import('../../domain/entities/class.entity.js')
const { ConflictError, NotFoundError } = await import('../../../../shared/application/app.error.js')
const { MESSAGES } = await import('../../../../shared/constants/messages.js')
const { TOKENS } = await import('../../../../shared/infrastructure/tokens.js')

const SUBJECT = { id: 'subj-1', subjectCode: 'PRF192', subjectName: 'Programming Fundamentals' }
const SEMESTER = { id: 'sem-1', code: 'Kỳ 1', season: 'Fall 2026' }

const PENDING = (over: Record<string, any> = {}) => ({
  Id: 'pe-1',
  UserId: 'user-1',
  ClassCode: 'SE1801',
  SemesterCode: 'Kỳ 1',
  SubjectCode: 'PRF192',
  Season: null,
  Status: 'Pending',
  ...over,
})

const DTO = (over: Partial<{ code: string; subjectId?: string; semesterId?: string; lecturerId?: string }> = {}) => ({
  data: {
    code: over.code ?? 'SE1801',
    subjectId: 'subjectId' in over ? over.subjectId : 'subj-1',
    semesterId: 'semesterId' in over ? over.semesterId : 'sem-1',
    lecturerId: 'lecturerId' in over ? over.lecturerId : undefined,
  },
})

/** The domain class the repositories hand back after the insert. */
const SAVED_CLASS = (over: Record<string, any> = {}) => ({
  id: 'class-1',
  classCode: 'SE1801',
  subjectId: 'subj-1',
  subjectCode: 'PRF192',
  subjectName: 'Programming Fundamentals',
  semesterId: 'sem-1',
  semesterName: 'Kỳ 1',
  studentCount: 0,
  ...over,
})

describe('FO18 / CreateClass — CreateClassUseCase.execute', () => {
  let classRepo: any
  let txClassRepo: any
  let subjectRepo: any
  let semesterRepo: any
  let userRepo: any
  let uow: any
  let useCase: InstanceType<typeof CreateClassUseCase>
  let errorSpy: any

  beforeEach(() => {
    jest.clearAllMocks()
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    txClassRepo = {
      create: jest.fn<(...a: any[]) => Promise<void>>().mockResolvedValue(undefined),
      assignInstructor: jest.fn<(...a: any[]) => Promise<void>>().mockResolvedValue(undefined),
      findById: jest.fn<(...a: any[]) => Promise<any>>().mockImplementation(async (id: string) => SAVED_CLASS({ id })),
    }
    classRepo = {
      findByCodeSemesterAndSubject: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(null),
      findById: jest.fn<(...a: any[]) => Promise<any>>().mockImplementation(async (id: string) => SAVED_CLASS({ id })),
    }
    subjectRepo = { findById: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(SUBJECT) }
    semesterRepo = { findById: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(SEMESTER) }
    userRepo = { findById: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({ id: 'lect-1' }) }

    const resolve = (token: symbol) => {
      if (token === TOKENS.ClassRepository) return classRepo
      if (token === TOKENS.SubjectRepository) return subjectRepo
      if (token === TOKENS.SemesterRepository) return semesterRepo
      if (token === TOKENS.UserRepository) return userRepo
      throw new Error(`Unexpected token: ${String(token)}`)
    }
    const txn = {
      resolve: jest.fn((token: symbol) => (token === TOKENS.ClassRepository ? txClassRepo : resolve(token))),
    }
    uow = {
      resolve: jest.fn(resolve),
      runInTransaction: jest.fn(async (cb: any) => cb(txn)),
    }

    prisma.pendingEnrollment = {
      findMany: jest.fn<(...a: any[]) => Promise<any[]>>().mockResolvedValue([]),
      updateMany: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
    }
    prisma.semester = {
      findUnique: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({ Id: 'sem-1', Season: null }),
    }
    prisma.studentClass = {
      findUnique: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(null),
      create: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
    }

    useCase = new CreateClassUseCase(uow as any)
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — happy path ──
  test('UTCID01: validates every reference, creates the class in a transaction and returns the DTO', async () => {
    const result = await useCase.execute(DTO() as any)

    expect(classRepo.findByCodeSemesterAndSubject).toHaveBeenCalledWith('SE1801', 'sem-1', 'subj-1')
    expect(subjectRepo.findById).toHaveBeenCalledWith('subj-1')
    expect(semesterRepo.findById).toHaveBeenCalledWith('sem-1')
    expect(uow.runInTransaction).toHaveBeenCalledTimes(1)
    expect(txClassRepo.create).toHaveBeenCalledTimes(1)

    expect(result).toMatchObject({
      code: 'SE1801',
      subject: { id: 'subj-1', code: 'PRF192' },
      semester: { id: 'sem-1', code: 'Kỳ 1' },
      lecturers: [],
      studentCount: 0,
    })
  })

  // ── UTCID02 — lecturer supplied ──
  test('UTCID02: validates the lecturer up front and assigns them inside the transaction', async () => {
    await useCase.execute(DTO({ lecturerId: 'lect-1' }) as any)

    expect(userRepo.findById).toHaveBeenCalledWith('lect-1')
    const created = txClassRepo.create.mock.calls[0][0]
    expect(txClassRepo.assignInstructor).toHaveBeenCalledWith(created.id, 'lect-1')
  })

  // ── UTCID03 — the entity handed to the repository ──
  test('UTCID03: builds the entity with a generated id, Active status and ClassCreatedEvent', async () => {
    await useCase.execute(DTO() as any)

    const created = txClassRepo.create.mock.calls[0][0]
    expect(created).toBeInstanceOf(Class)
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(created.classCode).toBe('SE1801')
    expect(created.subjectId).toBe('subj-1')
    expect(created.semesterId).toBe('sem-1')
    expect(created.status).toBe('Active')

    const events = created.domainEvents ?? []
    expect(events).toHaveLength(1)
    expect(events[0]).toBeInstanceOf(ClassCreatedEvent)
  })

  // ── UTCID04 — pending students picked up ──
  test('UTCID04: enrols matching pending students and marks the subject-specific rows Enrolled', async () => {
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING()])

    await useCase.execute(DTO() as any)

    expect(prisma.pendingEnrollment.findMany).toHaveBeenCalledWith({
      where: { ClassCode: 'SE1801', Status: 'Pending' },
    })
    expect(prisma.studentClass.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ UserId: 'user-1' }) }),
    )
    expect(prisma.pendingEnrollment.updateMany).toHaveBeenCalledWith({
      where: { Id: { in: ['pe-1'] } },
      data: { Status: 'Enrolled' },
    })
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID05 — the semester-wide row stays open ──
  test('UTCID05: enrols a semester-wide pending student but leaves the row Pending', async () => {
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING({ SubjectCode: null })])

    await useCase.execute(DTO() as any)

    expect(prisma.studentClass.create).toHaveBeenCalledTimes(1)
    // Kept Pending on purpose so the other subjects of this class can claim it too.
    expect(prisma.pendingEnrollment.updateMany).not.toHaveBeenCalled()
  })

  // ── UTCID06 — semester matched on its number ──
  test('UTCID06: matches a pending row whose semester code differs but carries the same number', async () => {
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING({ SemesterCode: 'Ky 1' })])

    await useCase.execute(DTO() as any)

    expect(prisma.studentClass.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID07 — subject code compared case-insensitively ──
  test('UTCID07: matches a pending row whose subject code differs only in case', async () => {
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING({ SubjectCode: 'prf192' })])

    await useCase.execute(DTO() as any)

    expect(prisma.studentClass.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID08 — the student is already on the roster ──
  test('UTCID08: does not write a duplicate enrolment for a student already in the class', async () => {
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING()])
    prisma.studentClass.findUnique.mockResolvedValue({ UserId: 'user-1', ClassId: 'class-1' })

    await useCase.execute(DTO() as any)

    expect(prisma.studentClass.create).not.toHaveBeenCalled()
    // The pending row is still closed out.
    expect(prisma.pendingEnrollment.updateMany).toHaveBeenCalled()
  })

  // ── UTCID09 — seasons agree ──
  test('UTCID09: keeps a pending row whose season matches the semester season', async () => {
    prisma.semester.findUnique.mockResolvedValue({ Id: 'sem-1', Season: 'Fall 2026' })
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING({ Season: 'Fall 2026' })])

    await useCase.execute(DTO() as any)

    expect(prisma.studentClass.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID10 — pending carries a season the class does not have ──
  test('UTCID10: drops a pending row with a season when the semester has none assigned', async () => {
    prisma.semester.findUnique.mockResolvedValue({ Id: 'sem-1', Season: null })
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING({ Season: 'Fall 2026' })])

    await useCase.execute(DTO() as any)

    expect(prisma.studentClass.create).not.toHaveBeenCalled()
  })

  // ── UTCID11 — the season string cannot be parsed ──
  test('UTCID11: drops a pending row whose season string cannot be detected', async () => {
    prisma.semester.findUnique.mockResolvedValue({ Id: 'sem-1', Season: 'Fall 2026' })
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING({ Season: '???' })])

    await useCase.execute(DTO() as any)

    expect(prisma.studentClass.create).not.toHaveBeenCalled()
  })

  // ── UTCID12 — no lecturer on the request ──
  test('UTCID12: never looks a lecturer up nor assigns one when lecturerId is omitted', async () => {
    await useCase.execute(DTO({ lecturerId: undefined }) as any)

    expect(userRepo.findById).not.toHaveBeenCalled()
    expect(txClassRepo.assignInstructor).not.toHaveBeenCalled()
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID13 / UTCID14 — the two mandatory ids ──
  test.each([
    ['UTCID13', { semesterId: undefined }],
    ['UTCID14', { subjectId: undefined }],
  ])('%s: rejects the request with a bare Error when a mandatory id is missing', async (_id, over) => {
    await expect(useCase.execute(DTO(over) as any)).rejects.toThrow('SemesterId and SubjectId are required')

    // As-built: a plain Error, so the API surfaces 500 rather than 400.
    expect(classRepo.findByCodeSemesterAndSubject).not.toHaveBeenCalled()
    expect(uow.runInTransaction).not.toHaveBeenCalled()
  })

  // ── UTCID15 — the triple is taken ──
  test('UTCID15: rejects a class code already used for that semester and subject', async () => {
    classRepo.findByCodeSemesterAndSubject.mockResolvedValue(SAVED_CLASS())

    await expect(useCase.execute(DTO() as any)).rejects.toMatchObject({
      constructor: ConflictError,
      message: MESSAGES.CLASS_ALREADY_EXISTS,
    })
    expect(uow.runInTransaction).not.toHaveBeenCalled()
  })

  // ── UTCID16 — unknown subject ──
  test('UTCID16: rejects an unknown subject id', async () => {
    subjectRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(DTO() as any)).rejects.toMatchObject({
      constructor: NotFoundError,
      message: MESSAGES.SUBJECT_NOT_FOUND,
    })
    expect(semesterRepo.findById).not.toHaveBeenCalled()
    expect(uow.runInTransaction).not.toHaveBeenCalled()
  })

  // ── UTCID17 — unknown semester ──
  test('UTCID17: rejects an unknown semester id', async () => {
    semesterRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(DTO() as any)).rejects.toMatchObject({
      constructor: NotFoundError,
      message: 'Không tìm thấy kỳ học',
    })
    expect(uow.runInTransaction).not.toHaveBeenCalled()
  })

  // ── UTCID18 — unknown lecturer ──
  test('UTCID18: rejects an unknown lecturer id before opening the transaction', async () => {
    userRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(DTO({ lecturerId: 'lect-missing' }) as any)).rejects.toMatchObject({
      constructor: NotFoundError,
      message: MESSAGES.INSTRUCTOR_NOT_FOUND,
    })
    expect(uow.runInTransaction).not.toHaveBeenCalled()
  })

  // ── UTCID19 — the transaction fails ──
  test('UTCID19: propagates a transaction failure and never starts the auto-enrolment', async () => {
    uow.runInTransaction.mockRejectedValue(new Error('transaction rolled back'))

    await expect(useCase.execute(DTO() as any)).rejects.toThrow('transaction rolled back')

    expect(prisma.pendingEnrollment.findMany).not.toHaveBeenCalled()
    expect(classRepo.findById).not.toHaveBeenCalled()
  })

  // ── UTCID20 — the auto-enrolment blows up ──
  test('UTCID20: swallows an auto-enrolment failure and still returns the created class', async () => {
    prisma.pendingEnrollment.findMany.mockRejectedValue(new Error('pending query failed'))

    const result = await useCase.execute(DTO() as any)

    // As-built: only a console.error — the caller cannot tell the enrolment pass failed.
    expect(errorSpy).toHaveBeenCalledWith('Failed to auto-enroll students:', expect.any(Error))
    expect(result.code).toBe('SE1801')
  })

  // ── UTCID21 — the final re-read comes back empty ──
  test('UTCID21: throws a raw TypeError when the final re-read finds nothing', async () => {
    classRepo.findById.mockResolvedValue(null)

    // As-built: ClassResponseDto.from(null) dereferences null, after the class was committed.
    await expect(useCase.execute(DTO() as any)).rejects.toThrow(TypeError)
    expect(txClassRepo.create).toHaveBeenCalledTimes(1)
  })
})
