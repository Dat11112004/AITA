/**
 * Unit Tests — FO16 / CreateSubject  (CreateSubjectUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "CreateSubject"):
 *   UTCID01 (N) — Code is free                  → subject created, semesters auto-linked, DTO returned
 *   UTCID02 (N) — Entity built from the request → generated id, fields set, SubjectCreatedEvent raised
 *   UTCID03 (N) — DTO built in memory           → response comes from the entity, no re-read
 *   UTCID04 (B) — Semester omitted              → auto-link skipped, DTO semester null
 *   UTCID05 (B) — Semester = 1 (lower bound)    → auto-link called with 1
 *   UTCID06 (B) — Semester = 9 (upper bound)    → auto-link called with 9
 *   UTCID07 (B) — Description omitted           → stored and returned as null
 *   UTCID08 (B) — Link list on create           → always the empty array, never the semester
 *   UTCID09 (B) — Two calls in a row            → each subject gets its own generated id
 *   UTCID10 (A) — Code already registered       → ConflictError before anything is written
 *   UTCID11 (A) — Duplicate lookup fails        → propagates, nothing created
 *   UTCID12 (A) — Insert fails                  → propagates, auto-link never runs
 *   UTCID13 (A) — Auto-link fails               → propagates AFTER the subject row was written
 *
 * Requirement (FO16): CreateSubjectUseCase.execute rejects a subject code that already exists with
 * a ConflictError; otherwise it builds a Subject with a freshly generated id (raising
 * SubjectCreatedEvent), persists it with an empty semester-link list, and — only when a semester
 * number was supplied — asks the repository to auto-link every semester carrying that number.
 * The response is mapped from the in-memory entity, so unlike FO14 there is no read-back.
 *
 * As-built note captured by these cases (behaviour is documented, NOT corrected):
 *   - Create and auto-link are two separate awaits with no transaction. If the auto-link fails the
 *     error propagates but the subject row stays behind, unlinked, and the caller sees only a
 *     failure — a retry then hits the duplicate-code guard — UTCID13.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { CreateSubjectUseCase } from './create-subject.use-case.js'
import { Subject, SubjectCreatedEvent } from '../../domain/entities/subject.entity.js'
import { ConflictError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

const DTO = (over: Partial<{ code: string; name: string; description?: string; semester?: number }> = {}) => ({
  data: {
    code: over.code ?? 'PRF192',
    name: over.name ?? 'Programming Fundamentals',
    description: 'description' in over ? over.description : 'Nhập môn lập trình',
    semester: 'semester' in over ? over.semester : 1,
  },
})

describe('FO16 / CreateSubject — CreateSubjectUseCase.execute', () => {
  let subjectRepo: {
    findByCode: jest.Mock<(code: string) => Promise<Subject | null>>
    create: jest.Mock<(s: Subject, ids?: string[]) => Promise<void>>
    autoLinkSemestersByNumber: jest.Mock<(id: string, n: number) => Promise<void>>
  }
  let useCase: CreateSubjectUseCase

  beforeEach(() => {
    subjectRepo = {
      findByCode: jest.fn<(code: string) => Promise<Subject | null>>().mockResolvedValue(null),
      create: jest.fn<(s: Subject, ids?: string[]) => Promise<void>>().mockResolvedValue(undefined),
      autoLinkSemestersByNumber: jest.fn<(id: string, n: number) => Promise<void>>().mockResolvedValue(undefined),
    }
    useCase = new CreateSubjectUseCase(subjectRepo as any)
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — happy path ──
  test('UTCID01: creates the subject, auto-links its semesters and returns the DTO', async () => {
    const result = await useCase.execute(DTO() as any)

    expect(subjectRepo.findByCode).toHaveBeenCalledWith('PRF192')
    expect(subjectRepo.create).toHaveBeenCalledTimes(1)

    const created = subjectRepo.create.mock.calls[0][0]
    expect(subjectRepo.autoLinkSemestersByNumber).toHaveBeenCalledWith(created.id, 1)
    expect(result).toEqual({
      id: created.id,
      code: 'PRF192',
      name: 'Programming Fundamentals',
      description: 'Nhập môn lập trình',
      status: 'active',
      semester: 1,
    })
  })

  // ── UTCID02 — the entity handed to the repository ──
  test('UTCID02: builds the entity with a generated id and raises SubjectCreatedEvent', async () => {
    await useCase.execute(DTO() as any)

    const created = subjectRepo.create.mock.calls[0][0]
    expect(created).toBeInstanceOf(Subject)
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(created.subjectCode).toBe('PRF192')
    expect(created.subjectName).toBe('Programming Fundamentals')
    expect(created.description).toBe('Nhập môn lập trình')
    expect(created.semester).toBe(1)
    expect(created.isActive).toBe(true)

    const events = created.domainEvents ?? []
    expect(events).toHaveLength(1)
    expect(events[0]).toBeInstanceOf(SubjectCreatedEvent)
    expect(events[0]).toMatchObject({ subjectId: created.id, subjectCode: 'PRF192' })
  })

  // ── UTCID03 — the response is the in-memory entity ──
  test('UTCID03: maps the response from the entity without reading the row back', async () => {
    const result = await useCase.execute(DTO() as any)

    const created = subjectRepo.create.mock.calls[0][0]
    expect(result.id).toBe(created.id)
    // Unlike FO14 there is no findById round-trip after the insert.
    expect((subjectRepo as any).findById).toBeUndefined()
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — no semester number on the request ──
  test('UTCID04: skips the auto-link entirely when no semester number is given', async () => {
    const result = await useCase.execute(DTO({ semester: undefined }) as any)

    expect(subjectRepo.create).toHaveBeenCalledTimes(1)
    expect(subjectRepo.autoLinkSemestersByNumber).not.toHaveBeenCalled()
    expect(subjectRepo.create.mock.calls[0][0].semester).toBeNull()
    expect(result.semester).toBeNull()
  })

  // ── UTCID05 / UTCID06 — the two ends of the accepted range ──
  test.each([
    ['UTCID05', 1],
    ['UTCID06', 9],
  ])('%s: auto-links every semester numbered %i', async (_id, semester) => {
    await useCase.execute(DTO({ semester }) as any)

    const created = subjectRepo.create.mock.calls[0][0]
    expect(created.semester).toBe(semester)
    expect(subjectRepo.autoLinkSemestersByNumber).toHaveBeenCalledWith(created.id, semester)
  })

  // ── UTCID07 — description omitted ──
  test('UTCID07: stores and returns a null description when none is supplied', async () => {
    const result = await useCase.execute(DTO({ description: undefined }) as any)

    expect(subjectRepo.create.mock.calls[0][0].description).toBeNull()
    expect(result.description).toBeNull()
  })

  // ── UTCID08 — the second argument of create ──
  test('UTCID08: always persists with an empty semester-link list', async () => {
    await useCase.execute(DTO({ semester: 5 }) as any)

    // The semester number drives the auto-link call, never the create() link list.
    expect(subjectRepo.create).toHaveBeenCalledWith(expect.any(Subject), [])
  })

  // ── UTCID09 — ids are per-call ──
  test('UTCID09: generates a distinct id for every subject created', async () => {
    await useCase.execute(DTO({ code: 'PRF192' }) as any)
    await useCase.execute(DTO({ code: 'MAE101' }) as any)

    const [first, second] = subjectRepo.create.mock.calls.map((c) => c[0])
    expect(first.id).not.toBe(second.id)
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID10 — the code is taken ──
  test('UTCID10: rejects an existing subject code before writing anything', async () => {
    subjectRepo.findByCode.mockResolvedValue(
      Subject.restore('subj-existing', 'PRF192', 'Programming Fundamentals', null, true, 1),
    )

    await expect(useCase.execute(DTO() as any)).rejects.toMatchObject({
      constructor: ConflictError,
      message: MESSAGES.SUBJECT_ALREADY_EXISTS,
    })

    expect(subjectRepo.create).not.toHaveBeenCalled()
    expect(subjectRepo.autoLinkSemestersByNumber).not.toHaveBeenCalled()
  })

  // ── UTCID11 — the duplicate lookup fails ──
  test('UTCID11: propagates a duplicate-check failure without creating anything', async () => {
    subjectRepo.findByCode.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute(DTO() as any)).rejects.toThrow('DB connection lost')

    expect(subjectRepo.create).not.toHaveBeenCalled()
    expect(subjectRepo.autoLinkSemestersByNumber).not.toHaveBeenCalled()
  })

  // ── UTCID12 — the insert fails ──
  test('UTCID12: propagates an insert failure and never runs the auto-link', async () => {
    subjectRepo.create.mockRejectedValue(new Error('unique constraint violated'))

    await expect(useCase.execute(DTO() as any)).rejects.toThrow('unique constraint violated')

    expect(subjectRepo.autoLinkSemestersByNumber).not.toHaveBeenCalled()
  })

  // ── UTCID13 — the auto-link fails after the row exists ──
  test('UTCID13: propagates an auto-link failure, leaving the subject created but unlinked', async () => {
    subjectRepo.autoLinkSemestersByNumber.mockRejectedValue(new Error('semester link insert failed'))

    await expect(useCase.execute(DTO() as any)).rejects.toThrow('semester link insert failed')

    // As-built: no transaction wraps the two steps, so the subject row survives the failure.
    expect(subjectRepo.create).toHaveBeenCalledTimes(1)
  })
})
