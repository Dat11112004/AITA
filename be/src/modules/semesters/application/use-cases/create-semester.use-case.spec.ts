/**
 * Unit Tests — FO14 / CreateSemester  (CreateSemesterUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "CreateSemester"):
 *   UTCID01 (N) — Code+season free              → semester created, response DTO returned
 *   UTCID02 (N) — Entity built from the request → fresh UUID, code, isActive, dates, season
 *   UTCID03 (N) — DTO reads the persisted row   → re-read wins over the in-memory entity
 *   UTCID04 (B) — Duplicate with a season       → message names both the code and the season
 *   UTCID05 (B) — Duplicate without a season    → short message, code only
 *   UTCID06 (B) — Duplicate, season is ''       → empty season falls back to the short message
 *   UTCID07 (B) — isActive = false              → carried onto the entity and the DTO
 *   UTCID08 (B) — No dates supplied             → startDate / endDate serialised as null
 *   UTCID09 (B) — Two calls in a row            → each semester gets its own generated id
 *   UTCID10 (A) — Duplicate lookup fails        → propagates, nothing created
 *   UTCID11 (A) — Insert fails                  → propagates, no re-read
 *   UTCID12 (A) — Re-read fails                 → propagates after the row was written
 *   UTCID13 (A) — Re-read returns null          → raw TypeError, no domain error
 *
 * Requirement (FO14): CreateSemesterUseCase.execute enforces the composite uniqueness the DB
 * declares as @@unique([Season, Code]) — it looks the pair up first and rejects a match with a
 * ConflictError whose message adapts to whether a season was supplied. Otherwise it builds a
 * Semester with a freshly generated id, persists it, then re-reads the row by id and returns
 * SemesterResponseDto.from(...) of that persisted copy.
 *
 * As-built note captured by these cases (behaviour is documented, NOT corrected):
 *   - The result is mapped from the re-read, not from the entity just created. If that re-read
 *     comes back null — a deleted row or a read-replica lag — the use-case dereferences null and
 *     throws a raw TypeError instead of a domain error, after the row has already been written
 *     (UTCID13).
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { CreateSemesterUseCase } from './create-semester.use-case.js'
import { Semester } from '../../domain/entities/semester.entity.js'
import { ConflictError } from '../../../../shared/application/app.error.js'

const DTO = (over: Partial<{ code: string; season?: string; isActive: boolean; startDate?: Date; endDate?: Date }> = {}) => ({
  data: {
    code: over.code ?? 'Kỳ 1',
    season: 'season' in over ? over.season : 'Fall 2026',
    isActive: over.isActive ?? true,
    startDate: over.startDate,
    endDate: over.endDate,
  },
})

describe('FO14 / CreateSemester — CreateSemesterUseCase.execute', () => {
  let semesterRepo: {
    findByCodeAndSeason: jest.Mock<(c: string, s?: string) => Promise<Semester | null>>
    create: jest.Mock<(s: Semester) => Promise<void>>
    findById: jest.Mock<(id: string) => Promise<Semester | null>>
  }
  let useCase: CreateSemesterUseCase

  beforeEach(() => {
    semesterRepo = {
      findByCodeAndSeason: jest.fn<(c: string, s?: string) => Promise<Semester | null>>().mockResolvedValue(null),
      create: jest.fn<(s: Semester) => Promise<void>>().mockResolvedValue(undefined),
      // The default re-read echoes back whatever was just persisted.
      findById: jest.fn<(id: string) => Promise<Semester | null>>(),
    }
    semesterRepo.findById.mockImplementation(async () => semesterRepo.create.mock.calls[0][0])
    useCase = new CreateSemesterUseCase(semesterRepo as any)
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — happy path ──
  test('UTCID01: creates the semester and returns its response DTO', async () => {
    const result = await useCase.execute(DTO() as any)

    expect(semesterRepo.findByCodeAndSeason).toHaveBeenCalledWith('Kỳ 1', 'Fall 2026')
    expect(semesterRepo.create).toHaveBeenCalledTimes(1)

    const created = semesterRepo.create.mock.calls[0][0]
    expect(semesterRepo.findById).toHaveBeenCalledWith(created.id)
    expect(result).toEqual({
      id: created.id,
      code: 'Kỳ 1',
      season: 'Fall 2026',
      isActive: true,
      startDate: null,
      endDate: null,
      classCount: 0,
      subjectCount: 0,
    })
  })

  // ── UTCID02 — the entity handed to the repository ──
  test('UTCID02: builds the entity with a generated id and the requested values', async () => {
    const startDate = new Date('2026-09-01T00:00:00.000Z')
    const endDate = new Date('2026-12-31T00:00:00.000Z')

    await useCase.execute(DTO({ startDate, endDate }) as any)

    const created = semesterRepo.create.mock.calls[0][0]
    expect(created).toBeInstanceOf(Semester)
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(created.code).toBe('Kỳ 1')
    expect(created.season).toBe('Fall 2026')
    expect(created.isActive).toBe(true)
    expect(created.startDate).toBe(startDate)
    expect(created.endDate).toBe(endDate)
  })

  // ── UTCID03 — the response mirrors the stored row, not the entity ──
  test('UTCID03: maps the response from the re-read row rather than the in-memory entity', async () => {
    const stored: any = Semester.create('stored-id', 'Kỳ 1 (normalised)', true, undefined, undefined, 'Fall 2026')
    stored.classCount = 4
    stored.subjectCount = 6
    semesterRepo.findById.mockResolvedValue(stored)

    const result = await useCase.execute(DTO() as any)

    // The generated id is NOT what comes back — the persisted row is.
    expect(result.id).toBe('stored-id')
    expect(result.code).toBe('Kỳ 1 (normalised)')
    expect(result.classCount).toBe(4)
    expect(result.subjectCount).toBe(6)
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — duplicate inside a season ──
  test('UTCID04: rejects a duplicate code+season naming both in the message', async () => {
    semesterRepo.findByCodeAndSeason.mockResolvedValue(
      Semester.create('sem-existing', 'Kỳ 1', true, undefined, undefined, 'Fall 2026'),
    )

    await expect(useCase.execute(DTO() as any)).rejects.toMatchObject({
      constructor: ConflictError,
      message: 'Kỳ học "Kỳ 1" trong mùa "Fall 2026" đã tồn tại',
    })
    expect(semesterRepo.create).not.toHaveBeenCalled()
    expect(semesterRepo.findById).not.toHaveBeenCalled()
  })

  // ── UTCID05 — duplicate with no season on the request ──
  test('UTCID05: rejects a duplicate code with the short message when no season is given', async () => {
    semesterRepo.findByCodeAndSeason.mockResolvedValue(Semester.create('sem-existing', 'Kỳ 1', true))

    await expect(useCase.execute(DTO({ season: undefined }) as any)).rejects.toMatchObject({
      constructor: ConflictError,
      message: 'Kỳ học "Kỳ 1" đã tồn tại',
    })
    expect(semesterRepo.findByCodeAndSeason).toHaveBeenCalledWith('Kỳ 1', undefined)
  })

  // ── UTCID06 — the empty-string boundary of that ternary ──
  test('UTCID06: treats an empty season as "no season" when wording the conflict', async () => {
    semesterRepo.findByCodeAndSeason.mockResolvedValue(Semester.create('sem-existing', 'Kỳ 1', true, undefined, undefined, ''))

    await expect(useCase.execute(DTO({ season: '' }) as any)).rejects.toMatchObject({
      message: 'Kỳ học "Kỳ 1" đã tồn tại',
    })
  })

  // ── UTCID07 — inactive semester ──
  test('UTCID07: carries isActive = false onto the entity and the response', async () => {
    const result = await useCase.execute(DTO({ isActive: false }) as any)

    expect(semesterRepo.create.mock.calls[0][0].isActive).toBe(false)
    expect(result.isActive).toBe(false)
  })

  // ── UTCID08 — dates omitted ──
  test('UTCID08: serialises missing start and end dates as null', async () => {
    const result = await useCase.execute(DTO() as any)

    expect(result.startDate).toBeNull()
    expect(result.endDate).toBeNull()
  })

  // ── UTCID08b / UTCID09 — ids are per-call ──
  test('UTCID09: generates a distinct id for every semester created', async () => {
    await useCase.execute(DTO({ code: 'Kỳ 1' }) as any)
    await useCase.execute(DTO({ code: 'Kỳ 2' }) as any)

    const [first, second] = semesterRepo.create.mock.calls.map((c) => c[0])
    expect(first.id).not.toBe(second.id)
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID10 — the uniqueness lookup fails ──
  test('UTCID10: propagates a duplicate-check failure without creating anything', async () => {
    semesterRepo.findByCodeAndSeason.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute(DTO() as any)).rejects.toThrow('DB connection lost')

    expect(semesterRepo.create).not.toHaveBeenCalled()
    expect(semesterRepo.findById).not.toHaveBeenCalled()
  })

  // ── UTCID11 — the insert fails ──
  test('UTCID11: propagates an insert failure and never re-reads the row', async () => {
    semesterRepo.create.mockRejectedValue(new Error('unique constraint violated'))

    await expect(useCase.execute(DTO() as any)).rejects.toThrow('unique constraint violated')

    expect(semesterRepo.findById).not.toHaveBeenCalled()
  })

  // ── UTCID12 — the re-read fails after a successful write ──
  test('UTCID12: propagates a re-read failure even though the row was already written', async () => {
    semesterRepo.findById.mockRejectedValue(new Error('read timeout'))

    await expect(useCase.execute(DTO() as any)).rejects.toThrow('read timeout')

    // As-built: the semester exists at this point; the caller just never sees it.
    expect(semesterRepo.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID13 — the re-read comes back empty ──
  test('UTCID13: throws a raw TypeError when the re-read finds nothing', async () => {
    semesterRepo.findById.mockResolvedValue(null)

    // As-built: SemesterResponseDto.from(null) dereferences null — there is no
    // NotFoundError and no rollback, so the row stays behind.
    await expect(useCase.execute(DTO() as any)).rejects.toThrow(TypeError)
    expect(semesterRepo.create).toHaveBeenCalledTimes(1)
  })
})
