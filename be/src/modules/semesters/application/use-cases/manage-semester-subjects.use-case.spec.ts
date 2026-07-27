/**
 * Unit Tests — FO15 / ManageSemesterSubjects  (ManageSemesterSubjectsUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "ManageSemesterSubjects"):
 *   UTCID01 (N) — Add and remove together      → repository called once, mapped rows returned
 *   UTCID02 (N) — Add only                     → empty remove list forwarded untouched
 *   UTCID03 (N) — Remove only                  → empty add list forwarded untouched
 *   UTCID04 (B) — Repository returns nothing   → empty array, no mapping performed
 *   UTCID05 (B) — Row carries a Subject join   → every field read from the relation
 *   UTCID06 (B) — Row has no Subject join      → falls back to the flat record fields
 *   UTCID07 (B) — IsActive false vs missing    → false honoured, undefined defaults to true
 *   UTCID08 (B) — Falsy Description / Semester → '' and 0 collapse to null (|| fallback)
 *   UTCID09 (B) — AssignedAt missing           → stamped with the current time
 *   UTCID10 (A) — Semester id not found        → raw Error naming the id, nothing managed
 *   UTCID11 (A) — Semester lookup fails        → propagates, nothing managed
 *   UTCID12 (A) — Manage step fails            → propagates after the semester was verified
 *
 * Requirement (FO15): ManageSemesterSubjectsUseCase.execute verifies the semester exists, then
 * delegates the whole add/remove set to ISemesterRepository.manageSemesterSubjects in one call and
 * maps whatever it returns through SemesterSubjectTableResponseDto.fromArray. The use-case itself
 * performs no per-subject validation — it neither checks that the ids exist nor that add and
 * remove lists are disjoint.
 *
 * As-built notes captured by these cases (behaviour is documented, NOT corrected):
 *   - A missing semester throws a bare `Error`, not a NotFoundError, so the API surfaces it as a
 *     500 rather than a 404 — UTCID10.
 *   - The response mapper uses `||` rather than `??` for Description and Semester, so an empty
 *     description and semester number 0 both come back as null — UTCID08.
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { ManageSemesterSubjectsUseCase } from './manage-semester-subjects.use-case.js'
import { Semester } from '../../domain/entities/semester.entity.js'

const SEMESTER_ID = 'sem-1'
const ASSIGNED_AT = new Date('2026-07-01T08:00:00.000Z')

/** A repository row shaped like the Prisma join (SemesterSubject → Subject). */
const JOIN_ROW = (over: Record<string, unknown> = {}) => ({
  AssignedAt: ASSIGNED_AT,
  Subject: {
    Id: 'subj-1',
    SubjectCode: 'PRF192',
    SubjectName: 'Programming Fundamentals',
    Description: 'Nhập môn lập trình',
    Semester: 1,
    IsActive: true,
  },
  ...over,
})

const REQUEST = (over: Partial<{ semesterId: string; addSubjectIds: string[]; removeSubjectIds: string[] }> = {}) => ({
  semesterId: over.semesterId ?? SEMESTER_ID,
  data: {
    addSubjectIds: over.addSubjectIds ?? ['subj-1'],
    removeSubjectIds: over.removeSubjectIds ?? ['subj-9'],
  },
})

describe('FO15 / ManageSemesterSubjects — ManageSemesterSubjectsUseCase.execute', () => {
  let semesterRepo: {
    findById: jest.Mock<(id: string) => Promise<Semester | null>>
    manageSemesterSubjects: jest.Mock<(id: string, a: string[], r: string[]) => Promise<any[]>>
  }
  let useCase: ManageSemesterSubjectsUseCase

  beforeEach(() => {
    semesterRepo = {
      findById: jest
        .fn<(id: string) => Promise<Semester | null>>()
        .mockResolvedValue(Semester.create(SEMESTER_ID, 'Kỳ 1', true, undefined, undefined, 'Fall 2026')),
      manageSemesterSubjects: jest
        .fn<(id: string, a: string[], r: string[]) => Promise<any[]>>()
        .mockResolvedValue([JOIN_ROW()]),
    }
    useCase = new ManageSemesterSubjectsUseCase(semesterRepo as any)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — add and remove in one request ──
  test('UTCID01: verifies the semester then applies both lists in a single repository call', async () => {
    const result = await useCase.execute(REQUEST() as any)

    expect(semesterRepo.findById).toHaveBeenCalledWith(SEMESTER_ID)
    expect(semesterRepo.manageSemesterSubjects).toHaveBeenCalledTimes(1)
    expect(semesterRepo.manageSemesterSubjects).toHaveBeenCalledWith(SEMESTER_ID, ['subj-1'], ['subj-9'])

    expect(result).toEqual([
      {
        id: 'subj-1',
        code: 'PRF192',
        name: 'Programming Fundamentals',
        description: 'Nhập môn lập trình',
        semester: 1,
        assignedAt: ASSIGNED_AT,
        isActive: true,
      },
    ])
  })

  // ── UTCID02 — add only ──
  test('UTCID02: forwards an empty remove list untouched when only adding', async () => {
    await useCase.execute(REQUEST({ addSubjectIds: ['subj-1', 'subj-2'], removeSubjectIds: [] }) as any)

    expect(semesterRepo.manageSemesterSubjects).toHaveBeenCalledWith(SEMESTER_ID, ['subj-1', 'subj-2'], [])
  })

  // ── UTCID03 — remove only ──
  test('UTCID03: forwards an empty add list untouched when only removing', async () => {
    await useCase.execute(REQUEST({ addSubjectIds: [], removeSubjectIds: ['subj-9'] }) as any)

    expect(semesterRepo.manageSemesterSubjects).toHaveBeenCalledWith(SEMESTER_ID, [], ['subj-9'])
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — nothing left on the semester ──
  test('UTCID04: returns an empty array when the repository reports no subjects', async () => {
    semesterRepo.manageSemesterSubjects.mockResolvedValue([])

    const result = await useCase.execute(REQUEST() as any)

    expect(result).toEqual([])
  })

  // ── UTCID05 — the joined shape ──
  test('UTCID05: reads every field from the Subject relation when the join is present', async () => {
    semesterRepo.manageSemesterSubjects.mockResolvedValue([
      JOIN_ROW({
        // Flat duplicates that must lose to the relation.
        id: 'flat-id',
        code: 'FLAT',
        name: 'Flat name',
      }),
    ])

    const [row] = await useCase.execute(REQUEST() as any)

    expect(row.id).toBe('subj-1')
    expect(row.code).toBe('PRF192')
    expect(row.name).toBe('Programming Fundamentals')
  })

  // ── UTCID06 — the flat shape ──
  test('UTCID06: falls back to the flat record fields when there is no Subject relation', async () => {
    semesterRepo.manageSemesterSubjects.mockResolvedValue([
      {
        id: 'subj-flat',
        code: 'MAE101',
        name: 'Mathematics for Engineering',
        description: 'Toán kỹ thuật',
        semester: 2,
        AssignedAt: ASSIGNED_AT,
      },
    ])

    const [row] = await useCase.execute(REQUEST() as any)

    expect(row).toEqual({
      id: 'subj-flat',
      code: 'MAE101',
      name: 'Mathematics for Engineering',
      description: 'Toán kỹ thuật',
      semester: 2,
      assignedAt: ASSIGNED_AT,
      isActive: true, // no Subject relation → the ?? default applies
    })
  })

  // ── UTCID07 — the isActive boundary ──
  test('UTCID07: keeps IsActive false but defaults an undefined flag to true', async () => {
    semesterRepo.manageSemesterSubjects.mockResolvedValue([
      JOIN_ROW({ Subject: { ...JOIN_ROW().Subject, IsActive: false } }),
      JOIN_ROW({ Subject: { ...JOIN_ROW().Subject, Id: 'subj-2', IsActive: undefined } }),
    ])

    const rows = await useCase.execute(REQUEST() as any)

    expect(rows[0].isActive).toBe(false)
    expect(rows[1].isActive).toBe(true)
  })

  // ── UTCID08 — the `||` fallbacks swallow legitimate falsy values ──
  test('UTCID08: collapses an empty description and semester 0 to null', async () => {
    semesterRepo.manageSemesterSubjects.mockResolvedValue([
      JOIN_ROW({ Subject: { ...JOIN_ROW().Subject, Description: '', Semester: 0 } }),
    ])

    const [row] = await useCase.execute(REQUEST() as any)

    // As-built: `||` not `??`, so '' and 0 are treated as "missing".
    expect(row.description).toBeNull()
    expect(row.semester).toBeNull()
  })

  // ── UTCID09 — no assignment timestamp on the row ──
  test('UTCID09: stamps the current time when the row carries no AssignedAt', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-22T10:30:00.000Z'))
    semesterRepo.manageSemesterSubjects.mockResolvedValue([JOIN_ROW({ AssignedAt: undefined })])

    const [row] = await useCase.execute(REQUEST() as any)

    expect(row.assignedAt).toEqual(new Date('2026-07-22T10:30:00.000Z'))
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID10 — unknown semester ──
  test('UTCID10: throws a bare Error naming the id when the semester does not exist', async () => {
    semesterRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(REQUEST({ semesterId: 'sem-missing' }) as any)).rejects.toThrow(
      'Kỳ học với ID sem-missing không tồn tại',
    )

    // As-built: a plain Error, so the API layer reports 500 instead of 404.
    await expect(useCase.execute(REQUEST({ semesterId: 'sem-missing' }) as any)).rejects.toMatchObject({
      constructor: Error,
    })
    expect(semesterRepo.manageSemesterSubjects).not.toHaveBeenCalled()
  })

  // ── UTCID11 — the lookup itself fails ──
  test('UTCID11: propagates a semester-lookup failure without managing anything', async () => {
    semesterRepo.findById.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute(REQUEST() as any)).rejects.toThrow('DB connection lost')

    expect(semesterRepo.manageSemesterSubjects).not.toHaveBeenCalled()
  })

  // ── UTCID12 — the add/remove step fails ──
  test('UTCID12: propagates a failure from the manage step after the semester was verified', async () => {
    semesterRepo.manageSemesterSubjects.mockRejectedValue(new Error('FK constraint violated'))

    await expect(useCase.execute(REQUEST() as any)).rejects.toThrow('FK constraint violated')

    expect(semesterRepo.findById).toHaveBeenCalledTimes(1)
  })
})
