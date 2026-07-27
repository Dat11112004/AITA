/**
 * Unit Tests — FO20 / ListClasses  (ListClassesUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "ListClasses"):
 *   UTCID01 (N) — ADMIN lists                    → no role filter, note included
 *   UTCID02 (N) — LECTURER lists                 → scoped to classes they instruct
 *   UTCID03 (N) — STUDENT lists                  → scoped to their enrolments, note hidden
 *   UTCID04 (B) — Default paging                 → page 1 / limit 10 → skip 0, take 10
 *   UTCID05 (B) — Explicit paging                → page 3 / limit 5 → skip 10, take 5
 *   UTCID06 (B) — No classes match               → empty array, no mapping
 *   UTCID07 (B) — Background sync, exact match   → pending student enrolled into the class
 *   UTCID08 (B) — Background sync, semester no.  → "Ky 1" matches semester code "Kỳ 1"
 *   UTCID09 (B) — Background sync, no SubjectCode → pending row matches any subject
 *   UTCID10 (B) — Background sync, already there → no duplicate StudentClass row
 *   UTCID11 (B) — STUDENT never triggers sync    → the background pass is skipped entirely
 *   UTCID12 (A) — Constructed without a UoW      → Error('uow is required')
 *   UTCID13 (A) — Repository listing fails       → propagates
 *   UTCID14 (A) — Background sync throws         → swallowed, the list is still returned
 *   UTCID15 (A) — Sync is not awaited            → execute resolves before the sync finishes
 *   UTCID16 (A) — page = 0                       → negative skip sent to the repository, no guard
 *
 * Requirement (FO20): ListClassesUseCase.execute scopes the query by role — LECTURER sees the
 * classes they instruct, STUDENT the ones they are enrolled in, ADMIN everything — pages the
 * result, and maps it through ClassResponseDto, including the internal note for staff only. For
 * every non-student caller it also kicks off a fire-and-forget background pass that retroactively
 * enrols PendingEnrollment rows into any class whose code, semester and subject match.
 *
 * As-built notes captured by these cases (behaviour is documented, NOT corrected):
 *   - The background sync is a floating promise: it is never awaited, its failures only reach
 *     console.error, and it runs on every listing request rather than on a schedule — UTCID14/15.
 *   - `page` and `limit` are used raw, so page 0 yields a negative skip — the same missing guard
 *     already recorded for FO09 ListUsers and FO17 GetSubjectStudents — UTCID16.
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'

// The background sync pulls the shared Prisma client in through a dynamic import.
const prisma: any = {}
jest.unstable_mockModule('../../../../database/prisma.js', () => ({ prisma }))

const { ListClassesUseCase } = await import('./list-classes.use-case.js')

const CLASS_ROW = (over: Record<string, any> = {}) => ({
  id: 'class-1',
  classCode: 'SE1801',
  subjectId: 'subj-1',
  subjectCode: 'PRF192',
  subjectName: 'Programming Fundamentals',
  semesterId: 'sem-1',
  semesterName: 'Kỳ 1',
  studentCount: 3,
  note: 'Ghi chú nội bộ',
  ...over,
})

const PENDING = (over: Record<string, any> = {}) => ({
  Id: 'pe-1',
  UserId: 'user-1',
  ClassCode: 'SE1801',
  SemesterCode: 'Kỳ 1',
  SubjectCode: 'PRF192',
  Status: 'Pending',
  ...over,
})

const CANDIDATE_CLASS = (over: Record<string, any> = {}) => ({
  Id: 'class-1',
  ClassCode: 'SE1801',
  SubjectId: 'subj-1',
  SemesterId: 'sem-1',
  Semester: { Code: 'Kỳ 1' },
  Subject: { SubjectCode: 'PRF192' },
  ...over,
})

/** Let the floating background promise (dynamic import + awaits) run to completion. */
const flush = async () => {
  for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r))
}

describe('FO20 / ListClasses — ListClassesUseCase.execute', () => {
  let classRepo: { findMany: jest.Mock<(f: any, p: any) => Promise<any[]>> }
  let uow: any
  let useCase: InstanceType<typeof ListClassesUseCase>
  let errorSpy: any

  beforeEach(() => {
    jest.clearAllMocks()
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    classRepo = {
      findMany: jest.fn<(f: any, p: any) => Promise<any[]>>().mockResolvedValue([CLASS_ROW()]),
    }
    uow = { resolve: jest.fn(), runInTransaction: jest.fn() }

    prisma.pendingEnrollment = {
      findMany: jest.fn<(...a: any[]) => Promise<any[]>>().mockResolvedValue([]),
    }
    prisma.class = {
      findMany: jest.fn<(...a: any[]) => Promise<any[]>>().mockResolvedValue([]),
    }
    prisma.studentClass = {
      findFirst: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(null),
      create: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
    }

    useCase = new ListClassesUseCase(classRepo as any, uow as any)
  })

  afterEach(async () => {
    await flush()
    errorSpy.mockRestore()
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — admin sees everything ──
  test('UTCID01: lists every class for an ADMIN and includes the internal note', async () => {
    const result = await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' } } as any)

    expect(classRepo.findMany).toHaveBeenCalledWith({}, { skip: 0, take: 10 })
    expect(result).toHaveLength(1)
    expect(result[0].note).toBe('Ghi chú nội bộ')
  })

  // ── UTCID02 — lecturer scope ──
  test('UTCID02: scopes the listing to the classes a LECTURER instructs', async () => {
    await useCase.execute({ user: { id: 'lect-1', role: 'LECTURER' } } as any)

    expect(classRepo.findMany).toHaveBeenCalledWith({ instructorId: 'lect-1' }, { skip: 0, take: 10 })
  })

  // ── UTCID03 — student scope, note hidden ──
  test('UTCID03: scopes to a STUDENT own enrolments and never exposes the internal note', async () => {
    const result = await useCase.execute({ user: { id: 'stu-1', role: 'STUDENT' } } as any)

    expect(classRepo.findMany).toHaveBeenCalledWith({ studentId: 'stu-1' }, { skip: 0, take: 10 })
    expect(result[0].note).toBeUndefined()
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — defaults ──
  test('UTCID04: defaults to page 1 with a limit of 10', async () => {
    await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' } } as any)

    expect(classRepo.findMany).toHaveBeenCalledWith({}, { skip: 0, take: 10 })
  })

  // ── UTCID05 — explicit paging ──
  test('UTCID05: converts page and limit into skip and take', async () => {
    await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' }, page: 3, limit: 5 } as any)

    expect(classRepo.findMany).toHaveBeenCalledWith({}, { skip: 10, take: 5 })
  })

  // ── UTCID06 — nothing matches ──
  test('UTCID06: returns an empty array when no class matches', async () => {
    classRepo.findMany.mockResolvedValue([])

    const result = await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' } } as any)

    expect(result).toEqual([])
  })

  // ── UTCID07 — the background pass enrols a pending student ──
  test('UTCID07: background sync enrols a pending student whose class, semester and subject match', async () => {
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING()])
    prisma.class.findMany.mockResolvedValue([CANDIDATE_CLASS()])

    await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' } } as any)
    await flush()

    expect(prisma.studentClass.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ UserId: 'user-1', ClassId: 'class-1' }),
    })
  })

  // ── UTCID08 — semester matched on its number ──
  test('UTCID08: background sync matches a semester written with a different code but the same number', async () => {
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING({ SemesterCode: 'Ky 1' })])
    prisma.class.findMany.mockResolvedValue([CANDIDATE_CLASS()])

    await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' } } as any)
    await flush()

    expect(prisma.studentClass.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID09 — semester-wide pending row ──
  test('UTCID09: background sync treats a pending row without a SubjectCode as matching any subject', async () => {
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING({ SubjectCode: null })])
    prisma.class.findMany.mockResolvedValue([CANDIDATE_CLASS({ Subject: { SubjectCode: 'MAE101' } })])

    await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' } } as any)
    await flush()

    expect(prisma.studentClass.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID10 — the student already has that subject in that semester ──
  test('UTCID10: background sync writes nothing when the student already has that subject and semester', async () => {
    prisma.pendingEnrollment.findMany.mockResolvedValue([PENDING()])
    prisma.class.findMany.mockResolvedValue([CANDIDATE_CLASS()])
    prisma.studentClass.findFirst.mockResolvedValue({ UserId: 'user-1', ClassId: 'class-other' })

    await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' } } as any)
    await flush()

    expect(prisma.studentClass.create).not.toHaveBeenCalled()
  })

  // ── UTCID11 — students never run the sync ──
  test('UTCID11: never starts the background sync for a STUDENT caller', async () => {
    await useCase.execute({ user: { id: 'stu-1', role: 'STUDENT' } } as any)
    await flush()

    expect(prisma.pendingEnrollment.findMany).not.toHaveBeenCalled()
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID12 — the constructor guard ──
  test('UTCID12: refuses to be constructed without a unit of work', () => {
    expect(() => new ListClassesUseCase(classRepo as any, undefined as any)).toThrow('uow is required')
  })

  // ── UTCID13 — the listing query fails ──
  test('UTCID13: propagates a repository failure', async () => {
    classRepo.findMany.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' } } as any)).rejects.toThrow(
      'DB connection lost',
    )
  })

  // ── UTCID14 — the background pass blows up ──
  test('UTCID14: swallows a background-sync failure and still returns the listing', async () => {
    prisma.pendingEnrollment.findMany.mockRejectedValue(new Error('pending query failed'))

    const result = await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' } } as any)
    await flush()

    // As-built: the caller gets a normal listing and only console.error records the failure.
    expect(result).toHaveLength(1)
    expect(errorSpy).toHaveBeenCalledWith('Background sync failed:', expect.any(Error))
  })

  // ── UTCID15 — the sync is fire-and-forget ──
  test('UTCID15: resolves without waiting for the background sync to finish', async () => {
    let releaseSync: () => void = () => {}
    const syncStarted = new Promise<void>((resolve) => {
      prisma.pendingEnrollment.findMany.mockImplementation(
        () =>
          new Promise((resolveQuery) => {
            resolve()
            releaseSync = () => resolveQuery([])
          }),
      )
    })

    // execute() settles even though the sync query is still pending.
    const result = await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' } } as any)
    expect(result).toHaveLength(1)

    await syncStarted
    expect(prisma.studentClass.create).not.toHaveBeenCalled()
    releaseSync()
  })

  // ── UTCID16 — no guard on the page number ──
  test('UTCID16: sends a negative skip to the repository when page is 0', async () => {
    await useCase.execute({ user: { id: 'admin-1', role: 'ADMIN' }, page: 0, limit: 10 } as any)

    // As-built: same missing pagination guard as FO09 and FO17.
    expect(classRepo.findMany).toHaveBeenCalledWith({}, { skip: -10, take: 10 })
  })
})
