/**
 * Unit Tests — FO17 / GetSubjectStudents  (GetSubjectStudentsUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "GetSubjectStudents"):
 *   UTCID01 (N) — Subject exists, one page       → mapped roster + pagination meta
 *   UTCID02 (N) — Roster query                   → subject id, filters and the offset window forwarded once
 *   UTCID03 (N) — Row mapping                    → user + class fields, placeholder progress/grade
 *   UTCID04 (B) — semesterId supplied / omitted  → forwarded as given
 *   UTCID05 (B) — classId supplied               → forwarded as given
 *   UTCID06 (B) — classId = 'all' or omitted     → forwarded verbatim, the use-case never reads the sentinel
 *   UTCID07 (B) — page 2                         → skip = (page-1) * limit
 *   UTCID08 (B) — No enrolments                  → empty data, totalPages 0
 *   UTCID09 (B) — total not a multiple of limit  → totalPages rounds up
 *   UTCID10 (B) — StudentCode is null            → falls back to the user id
 *   UTCID11 (B) — Enrolment with no User         → dropped from data but still counted in total
 *   UTCID12 (B) — Avatar present / absent        → mapped straight through, undefined when the row has none
 *   UTCID13 (A) — Subject id unknown             → NotFoundError, roster never queried
 *   UTCID14 (A) — Subject lookup fails           → propagates, roster never queried
 *   UTCID15 (A) — Roster query fails             → propagates
 *   UTCID16 (A) — page = 0                       → negative skip handed to the repository, no guard
 *
 * Requirement (FO17): GetSubjectStudentsUseCase.execute resolves ISubjectRepository from the unit of
 * work, verifies the subject exists, translates page/limit into a skip/take window, and asks the
 * repository for the roster — passing the optional semester and class filters straight through. It
 * maps each enrolment to a flat student row, skipping enrolments whose User row is missing, and
 * returns the page together with total/page/limit/totalPages.
 *
 * Scope note: the where clause, the ordering, the Prisma `select` and the meaning of the 'all'
 * sentinel live in PrismaSubjectRepository.getSubjectStudents, not in this use-case. These cases
 * therefore assert what the use-case hands the repository, not the SQL it ends up building.
 *
 * As-built notes captured by these cases (behaviour is documented, NOT corrected):
 *   - `page` and `limit` are used raw: page 0 produces a negative `skip` that is handed to the
 *     repository — UTCID16. Same missing-guard shape as FO09 ListUsers.
 *   - An enrolment whose User is missing is filtered out of `data` but still counted in `total`, so
 *     a page can return fewer rows than `limit` while `totalPages` still claims otherwise — UTCID11.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { GetSubjectStudentsUseCase } from './get-subject-students.use-case.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'

const SUBJECT_ID = 'subj-1'

const ENROLMENT = (over: Record<string, any> = {}) => ({
  User: { Id: 'user-1', FullName: 'Nguyen Van A', Email: 'a@fpt.edu.vn', StudentCode: 'HE180001' },
  Class: { Id: 'class-1', ClassCode: 'SE1801' },
  ...over,
})

const PARAMS = (over: Partial<{ subjectId: string; semesterId?: string; classId?: string; page: number; limit: number }> = {}) => ({
  subjectId: over.subjectId ?? SUBJECT_ID,
  semesterId: 'semesterId' in over ? over.semesterId : undefined,
  classId: 'classId' in over ? over.classId : undefined,
  page: over.page ?? 1,
  limit: over.limit ?? 10,
})

describe('FO17 / GetSubjectStudents — GetSubjectStudentsUseCase.execute', () => {
  let subjectRepo: {
    findById: jest.Mock<(...a: any[]) => Promise<any>>
    getSubjectStudents: jest.Mock<(...a: any[]) => Promise<{ total: number; enrollments: any[] }>>
  }
  let uow: { resolve: jest.Mock<(token: symbol) => any> }
  let useCase: GetSubjectStudentsUseCase

  beforeEach(() => {
    subjectRepo = {
      findById: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({ id: SUBJECT_ID, code: 'PRF192' }),
      getSubjectStudents: jest
        .fn<(...a: any[]) => Promise<{ total: number; enrollments: any[] }>>()
        .mockResolvedValue({ total: 1, enrollments: [ENROLMENT()] }),
    }
    uow = { resolve: jest.fn((_token: symbol) => subjectRepo) }
    useCase = new GetSubjectStudentsUseCase(uow as any)
  })

  /** The positional arguments of the single roster query: [subjectId, semesterId, classId, skip, take]. */
  const rosterArgs = () => subjectRepo.getSubjectStudents.mock.calls[0] as any[]

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — happy path ──
  test('UTCID01: returns the roster page with its pagination meta', async () => {
    const result = await useCase.execute(PARAMS() as any)

    expect(uow.resolve).toHaveBeenCalledWith(TOKENS.SubjectRepository)
    expect(subjectRepo.findById).toHaveBeenCalledWith(SUBJECT_ID)
    expect(result).toEqual({
      data: [
        {
          id: 'user-1',
          studentCode: 'HE180001',
          name: 'Nguyen Van A',
          email: 'a@fpt.edu.vn',
          avatar: undefined,
          classId: 'class-1',
          classCode: 'SE1801',
          progress: '—',
          grade: '—',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
  })

  // ── UTCID02 — one roster query carrying the subject, the filters and the window ──
  test('UTCID02: forwards the subject, the filters and the offset window in a single roster query', async () => {
    await useCase.execute(PARAMS({ semesterId: 'sem-1', classId: 'class-1' }) as any)

    expect(subjectRepo.getSubjectStudents).toHaveBeenCalledTimes(1)
    expect(rosterArgs()).toEqual([SUBJECT_ID, 'sem-1', 'class-1', 0, 10])
  })

  // ── UTCID03 — the flat row shape ──
  test('UTCID03: flattens the user and class relations and stubs progress and grade', async () => {
    const [row] = (await useCase.execute(PARAMS() as any)).data

    expect(row.id).toBe('user-1')
    expect(row.name).toBe('Nguyen Van A')
    expect(row.classCode).toBe('SE1801')
    // Placeholders reserved for the grading modules.
    expect(row.progress).toBe('—')
    expect(row.grade).toBe('—')
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — the semester filter is passed through as-is ──
  test('UTCID04: forwards the semesterId when supplied and undefined when omitted', async () => {
    await useCase.execute(PARAMS({ semesterId: 'sem-1' }) as any)
    expect(rosterArgs()[1]).toBe('sem-1')

    subjectRepo.getSubjectStudents.mockClear()
    await useCase.execute(PARAMS({ semesterId: undefined }) as any)
    expect(rosterArgs()[1]).toBeUndefined()
  })

  // ── UTCID05 — a concrete class id ──
  test('UTCID05: forwards a concrete classId to the roster query', async () => {
    await useCase.execute(PARAMS({ classId: 'class-1' }) as any)

    expect(rosterArgs()[2]).toBe('class-1')
  })

  // ── UTCID06 — the 'all' sentinel is the repository's business, not the use-case's ──
  test.each([['all'], [undefined]])('UTCID06: forwards classId %s verbatim without interpreting it', async (classId) => {
    await useCase.execute(PARAMS({ classId }) as any)

    expect(rosterArgs()[2]).toBe(classId)
  })

  // ── UTCID07 — offset arithmetic ──
  test('UTCID07: skips a full page worth of rows on page 2', async () => {
    await useCase.execute(PARAMS({ page: 2, limit: 10 }) as any)

    expect(rosterArgs()[3]).toBe(10)
    expect(rosterArgs()[4]).toBe(10)
  })

  // ── UTCID08 — nobody enrolled ──
  test('UTCID08: returns an empty page and zero totalPages when nothing matches', async () => {
    subjectRepo.getSubjectStudents.mockResolvedValue({ total: 0, enrollments: [] })

    const result = await useCase.execute(PARAMS() as any)

    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
    expect(result.totalPages).toBe(0)
  })

  // ── UTCID09 — the ceiling on the last partial page ──
  test('UTCID09: rounds totalPages up when the total is not a multiple of the limit', async () => {
    subjectRepo.getSubjectStudents.mockResolvedValue({ total: 25, enrollments: [ENROLMENT()] })

    const result = await useCase.execute(PARAMS({ limit: 10 }) as any)

    expect(result.totalPages).toBe(3)
  })

  // ── UTCID10 — student without a student code ──
  test('UTCID10: falls back to the user id when StudentCode is null', async () => {
    subjectRepo.getSubjectStudents.mockResolvedValue({
      total: 1,
      enrollments: [ENROLMENT({ User: { Id: 'user-2', FullName: 'B', Email: 'b@fpt.edu.vn', StudentCode: null } })],
    })

    const [row] = (await useCase.execute(PARAMS() as any)).data

    expect(row.studentCode).toBe('user-2')
  })

  // ── UTCID11 — orphaned enrolment ──
  test('UTCID11: drops an enrolment with no User but still counts it in the total', async () => {
    subjectRepo.getSubjectStudents.mockResolvedValue({
      total: 2,
      enrollments: [ENROLMENT(), ENROLMENT({ User: null })],
    })

    const result = await useCase.execute(PARAMS() as any)

    // As-built: data and total disagree — the page returns fewer rows than the count implies.
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(2)
  })

  // ── UTCID12 — the avatar is copied straight off the row ──
  test('UTCID12: maps the avatar through and leaves it undefined when the row has none', async () => {
    subjectRepo.getSubjectStudents.mockResolvedValue({
      total: 1,
      enrollments: [
        ENROLMENT({ User: { Id: 'user-1', FullName: 'A', Email: 'a@fpt.edu.vn', StudentCode: 'HE180001', Avatar: 'https://cdn/a.png' } }),
      ],
    })
    expect((await useCase.execute(PARAMS() as any)).data[0].avatar).toBe('https://cdn/a.png')

    // The default enrolment carries no Avatar, so the mapped row reports undefined rather than null.
    subjectRepo.getSubjectStudents.mockResolvedValue({ total: 1, enrollments: [ENROLMENT()] })
    const row = (await useCase.execute(PARAMS() as any)).data[0]
    expect(row).toHaveProperty('avatar')
    expect(row.avatar).toBeUndefined()
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID13 — unknown subject ──
  test('UTCID13: throws NotFoundError and never queries the roster when the subject is unknown', async () => {
    subjectRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(PARAMS({ subjectId: 'subj-missing' }) as any)).rejects.toThrow(NotFoundError)
    await expect(useCase.execute(PARAMS({ subjectId: 'subj-missing' }) as any)).rejects.toThrow(MESSAGES.SUBJECT_NOT_FOUND)

    expect(subjectRepo.getSubjectStudents).not.toHaveBeenCalled()
  })

  // ── UTCID14 — the subject lookup fails ──
  test('UTCID14: propagates a subject-lookup failure without querying the roster', async () => {
    subjectRepo.findById.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute(PARAMS() as any)).rejects.toThrow('DB connection lost')

    expect(subjectRepo.getSubjectStudents).not.toHaveBeenCalled()
  })

  // ── UTCID15 — the roster query fails ──
  test('UTCID15: propagates a failure from the roster query', async () => {
    subjectRepo.getSubjectStudents.mockRejectedValue(new Error('count timeout'))

    await expect(useCase.execute(PARAMS() as any)).rejects.toThrow('count timeout')
  })

  // ── UTCID16 — no guard on the page number ──
  test('UTCID16: hands a negative skip to the repository when page is 0', async () => {
    await useCase.execute(PARAMS({ page: 0, limit: 10 }) as any)

    // As-built: page/limit are never validated here (same gap as FO09 ListUsers).
    expect(rosterArgs()[3]).toBe(-10)
  })
})
