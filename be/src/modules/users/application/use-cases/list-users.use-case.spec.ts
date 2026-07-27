/**
 * Unit Tests — FO09 / ListUsers  (ListUsersUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "ListUsers"):
 *   UTCID01 (N) — No arguments                    → defaults role=all, page=1, limit=10
 *   UTCID02 (N) — Every filter supplied           → role + search in filter, skip computed
 *   UTCID03 (N) — Result mapping                  → entities mapped to UserResponseDto
 *   UTCID04 (B) — role = 'all'                    → NO role key in the filter at all
 *   UTCID05 (B) — role in lower case              → upper-cased before filtering
 *   UTCID06 (B) — page = 1                        → skip = 0 (first page)
 *   UTCID07 (B) — search = '' (empty string)      → falsy, so the key is omitted
 *   UTCID08 (B) — repository returns nothing      → empty array, no mapping performed
 *   UTCID09 (B) — search of spaces only           → passed through untrimmed (as-built)
 *   UTCID10 (A) — page = 0                        → skip goes NEGATIVE, no guard exists
 *   UTCID11 (A) — limit = 0                       → take = 0, skip collapses to 0
 *   UTCID12 (A) — repository failure              → propagates, nothing mapped
 *
 * Requirement (FO09): ListUsersUseCase.execute builds a repository filter from the optional
 * role and search arguments — omitting `role` entirely when it is 'all' and upper-casing it
 * otherwise, omitting `search` when falsy — computes `skip = (page - 1) * limit` with the
 * defaults role='all', page=1, limit=10, and maps every returned entity to a UserResponseDto.
 *
 * Documented as-built: the use-case performs NO validation of page/limit, so page=0 or a
 * negative page produces a negative skip, and a whitespace-only search is forwarded untrimmed.
 * UTCID09-UTCID11 lock that in; if validation is added later, those cases must change.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { ListUsersUseCase } from './list-users.use-case.js'
import { User, UserRoleType, UserStatusType } from '../../../auth/domain/entities/user.entity.js'

function makeUser(over: {
  id?: string
  email?: string | null
  fullName?: string | null
  status?: UserStatusType | null
  roles?: UserRoleType[]
} = {}): User {
  return User.restore(
    over.id ?? 'user-1',
    over.email === undefined ? 'lecturer@fpt.edu.vn' : over.email,
    'stored-hash',
    over.fullName === undefined ? 'Test Lecturer' : over.fullName,
    null, null, null, null,
    over.status === undefined ? 'Active' : over.status,
    null, null, null,
    over.roles ?? ['LECTURER'],
  )
}

describe('FO09 / ListUsers — ListUsersUseCase.execute', () => {
  let userRepo: { findMany: jest.Mock<(f?: unknown, p?: unknown) => Promise<User[]>> }
  let logger: {
    info: jest.Mock<(m: string) => void>
    warn: jest.Mock<(m: string) => void>
    debug: jest.Mock<(m: string) => void>
    error: jest.Mock<(m: string) => void>
    createChild: jest.Mock<() => unknown>
  }
  let useCase: ListUsersUseCase

  beforeEach(() => {
    userRepo = {
      findMany: jest.fn<(f?: unknown, p?: unknown) => Promise<User[]>>().mockResolvedValue([makeUser()]),
    }
    logger = {
      info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn(), createChild: jest.fn(),
    }
    useCase = new ListUsersUseCase(userRepo as any, logger as any)
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — defaults ──
  test('UTCID01: applies the default role, page and limit when nothing is supplied', async () => {
    await useCase.execute({})

    expect(userRepo.findMany).toHaveBeenCalledWith({}, { skip: 0, take: 10 })
  })

  // ── UTCID02 — every filter supplied ──
  test('UTCID02: forwards role and search and computes skip from page and limit', async () => {
    await useCase.execute({ role: 'STUDENT', search: 'nguyen', page: 3, limit: 20 })

    expect(userRepo.findMany).toHaveBeenCalledWith(
      { role: 'STUDENT', search: 'nguyen' },
      { skip: 40, take: 20 },   // (3 - 1) * 20
    )
  })

  // ── UTCID03 — entities are mapped to the response DTO ──
  test('UTCID03: maps every returned entity to a UserResponseDto', async () => {
    userRepo.findMany.mockResolvedValue([
      makeUser({ id: 'u-1', email: 'a@fpt.edu.vn', fullName: 'Anh A', roles: ['ADMIN'] }),
      makeUser({ id: 'u-2', email: 'b@fpt.edu.vn', fullName: 'Binh B', roles: ['STUDENT'] }),
    ])

    const result = await useCase.execute({})

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(expect.objectContaining({
      id: 'u-1', email: 'a@fpt.edu.vn', fullName: 'Anh A', role: 'admin', status: 'active',
    }))
    expect(result[1]).toEqual(expect.objectContaining({ id: 'u-2', role: 'student' }))
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — 'all' means no role filter at all ──
  test("UTCID04: omits the role key entirely when role is 'all'", async () => {
    await useCase.execute({ role: 'all' })

    const [filter] = userRepo.findMany.mock.calls[0]
    expect(filter).toEqual({})
    expect(filter).not.toHaveProperty('role')   // not 'ALL' — absent
  })

  // ── UTCID05 — role is upper-cased ──
  test('UTCID05: upper-cases a lower-case role before filtering', async () => {
    await useCase.execute({ role: 'lecturer' })

    expect(userRepo.findMany).toHaveBeenCalledWith({ role: 'LECTURER' }, { skip: 0, take: 10 })
  })

  // ── UTCID06 — first page starts at offset 0 ──
  test('UTCID06: computes skip = 0 for the first page', async () => {
    await useCase.execute({ page: 1, limit: 25 })

    expect(userRepo.findMany).toHaveBeenCalledWith({}, { skip: 0, take: 25 })
  })

  // ── UTCID07 — empty search string is dropped ──
  test('UTCID07: omits an empty search string from the filter', async () => {
    await useCase.execute({ search: '' })

    const [filter] = userRepo.findMany.mock.calls[0]
    expect(filter).toEqual({})
    expect(filter).not.toHaveProperty('search')
  })

  // ── UTCID08 — no rows found ──
  test('UTCID08: returns an empty array when the repository finds nothing', async () => {
    userRepo.findMany.mockResolvedValue([])

    const result = await useCase.execute({ role: 'ADMIN' })

    expect(result).toEqual([])
  })

  // ── UTCID09 — whitespace-only search is NOT trimmed ──
  test('UTCID09: forwards a whitespace-only search untrimmed', async () => {
    await useCase.execute({ search: '   ' })

    // '   ' is truthy, so it reaches the repository exactly as supplied.
    expect(userRepo.findMany).toHaveBeenCalledWith({ search: '   ' }, { skip: 0, take: 10 })
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID10 — page 0 produces a negative offset ──
  test('UTCID10: produces a negative skip for page = 0 because nothing validates it', async () => {
    await useCase.execute({ page: 0, limit: 10 })

    // (0 - 1) * 10 = -10 — forwarded straight to the repository.
    expect(userRepo.findMany).toHaveBeenCalledWith({}, { skip: -10, take: 10 })
  })

  // ── UTCID11 — limit 0 asks for zero rows ──
  test('UTCID11: forwards take = 0 when limit is 0', async () => {
    await useCase.execute({ page: 4, limit: 0 })

    // (4 - 1) * 0 = 0 — the page number becomes meaningless.
    expect(userRepo.findMany).toHaveBeenCalledWith({}, { skip: 0, take: 0 })
  })

  // ── UTCID12 — repository failure ──
  test('UTCID12: propagates a repository failure without mapping anything', async () => {
    userRepo.findMany.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute({})).rejects.toThrow('DB connection lost')
  })
})
