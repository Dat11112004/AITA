/**
 * Unit Tests — FO08 / CreateUser  (CreateUserUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "CreateUser"):
 *   UTCID01 (N) — New email, role row exists        → user created, role assigned, DTO returned
 *   UTCID02 (N) — Success side-effects              → hashed password, lowercased email, entity fields
 *   UTCID03 (N) — Transactional integrity           → exactly ONE transaction, tx-scoped repository
 *   UTCID04 (B) — Role ADMIN                       → passed through to entity + role lookup
 *   UTCID05 (B) — Role LECTURER                     → passed through to entity + role lookup
 *   UTCID06 (B) — Role STUDENT                      → passed through to entity + role lookup
 *   UTCID07 (B) — Mixed-case email                  → looked up raw, stored lowercased
 *   UTCID08 (B) — Role row missing in DB            → still succeeds, assignRole skipped, warn logged
 *   UTCID09 (A) — Email already in use              → ConflictError before hashing / transaction
 *   UTCID10 (A) — Duplicate-check lookup fails      → propagates, nothing hashed, no transaction
 *   UTCID11 (A) — Password hashing fails            → propagates, transaction never opened
 *   UTCID12 (A) — User insert fails inside the tx   → propagates, role never looked up
 *   UTCID13 (A) — Role lookup fails                 → propagates, role never assigned
 *   UTCID14 (A) — Role assignment fails             → propagates
 *   UTCID15 (A) — Transaction itself fails          → propagates, nothing committed
 *
 * Requirement (FO08): CreateUserUseCase.execute is the admin-driven account creation path.
 * It rejects a duplicate email with ConflictError BEFORE hashing or opening a transaction;
 * otherwise it hashes the password and, inside a single Unit-of-Work transaction, creates the
 * user with the email lowercased and the requested role, then assigns that role when the role
 * row exists — returning a UserResponseDto. Unlike FO07 it issues no tokens and writes no
 * audit entry.
 *
 * Note: when the role row is missing the account is still created, so it ends up with the role
 * on the entity but no role assignment row — documented as-built in UTCID08.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { CreateUserUseCase } from './create-user.use-case.js'
import { User } from '../../../auth/domain/entities/user.entity.js'
import { ConflictError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'

const INPUT = (over: Partial<{ email: string; fullName: string; password: string; role: string }> = {}) => ({
  email: over.email ?? 'new.lecturer@fpt.edu.vn',
  fullName: over.fullName ?? 'New Lecturer',
  password: over.password ?? 'Secret123',
  role: over.role ?? 'LECTURER',
})

describe('FO08 / CreateUser — CreateUserUseCase.execute', () => {
  let userRepo: { findByEmail: jest.Mock<(e: string) => Promise<User | null>> }
  let txUserRepo: {
    create: jest.Mock<(u: User) => Promise<void>>
    findRoleByName: jest.Mock<(n: string) => Promise<{ id: string; name: string } | null>>
    assignRole: jest.Mock<(userId: string, roleId: string) => Promise<void>>
  }
  let txUow: { resolve: jest.Mock }
  let uow: { runInTransaction: jest.Mock }
  let hashService: { hash: jest.Mock<(pw: string) => Promise<string>> }
  let logger: {
    info: jest.Mock<(m: string) => void>
    warn: jest.Mock<(m: string) => void>
    debug: jest.Mock<(m: string) => void>
    error: jest.Mock<(m: string) => void>
    createChild: jest.Mock<() => unknown>
  }
  let useCase: CreateUserUseCase

  beforeEach(() => {
    userRepo = { findByEmail: jest.fn<(e: string) => Promise<User | null>>().mockResolvedValue(null) }
    txUserRepo = {
      create: jest.fn<(u: User) => Promise<void>>().mockResolvedValue(undefined),
      findRoleByName: jest
        .fn<(n: string) => Promise<{ id: string; name: string } | null>>()
        .mockResolvedValue({ id: 'role-lecturer', name: 'LECTURER' }),
      assignRole: jest.fn<(userId: string, roleId: string) => Promise<void>>().mockResolvedValue(undefined),
    }
    txUow = {
      resolve: jest.fn((token: symbol) => {
        if (token === TOKENS.UserRepository) return txUserRepo
        throw new Error(`Unexpected token resolved: ${String(token)}`)
      }),
    }
    uow = { runInTransaction: jest.fn((cb: (u: typeof txUow) => unknown) => cb(txUow)) }
    hashService = { hash: jest.fn<(pw: string) => Promise<string>>().mockResolvedValue('hashed-pw') }
    logger = {
      info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn(), createChild: jest.fn(),
    }
    useCase = new CreateUserUseCase(userRepo as any, uow as any, hashService as any, logger as any)
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — happy path ──
  test('UTCID01: creates the account, assigns the role and returns the user DTO', async () => {
    const result = await useCase.execute(INPUT() as any)

    const created = txUserRepo.create.mock.calls[0][0]
    expect(result.id).toBe(created.id)
    expect(result.email).toBe('new.lecturer@fpt.edu.vn')
    expect(result.role).toBe('lecturer')
    expect(result.status).toBe('active')

    expect(txUserRepo.create).toHaveBeenCalledTimes(1)
    expect(txUserRepo.findRoleByName).toHaveBeenCalledWith('LECTURER')
    expect(txUserRepo.assignRole).toHaveBeenCalledWith(created.id, 'role-lecturer')
    expect(logger.info).toHaveBeenCalledWith(`Successfully created user: ${created.id}`)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  // ── UTCID02 — side-effects on the persisted entity ──
  test('UTCID02: hashes the password and stores it on the entity with the lowercased email', async () => {
    await useCase.execute(INPUT() as any)

    expect(hashService.hash).toHaveBeenCalledWith('Secret123')
    const created = txUserRepo.create.mock.calls[0][0]
    expect(created.passwordHash).toBe('hashed-pw')
    expect(created.email).toBe('new.lecturer@fpt.edu.vn')
    expect(created.fullName).toBe('New Lecturer')
    expect(created.roles).toEqual(['LECTURER'])
    expect(created.status).toBe('Active')
  })

  // ── UTCID03 — one transaction, tx-scoped repository ──
  test('UTCID03: performs the writes in a single transaction using the tx-scoped repository', async () => {
    await useCase.execute(INPUT() as any)

    expect(uow.runInTransaction).toHaveBeenCalledTimes(1)
    expect(txUow.resolve).toHaveBeenCalledWith(TOKENS.UserRepository)
    // The outer repository is only used for the pre-flight duplicate check.
    expect(userRepo.findByEmail).toHaveBeenCalledTimes(1)
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04-06 — one case per allowed role value ──
  test.each([
    ['UTCID04', 'ADMIN', 'admin'],
    ['UTCID05', 'LECTURER', 'lecturer'],
    ['UTCID06', 'STUDENT', 'student'],
  ])('%s: creates a %s account and looks that role up', async (_id, role, expected) => {
    txUserRepo.findRoleByName.mockResolvedValue({ id: `role-${expected}`, name: role })

    const result = await useCase.execute(INPUT({ role }) as any)

    const created = txUserRepo.create.mock.calls[0][0]
    expect(created.roles).toEqual([role])
    expect(txUserRepo.findRoleByName).toHaveBeenCalledWith(role)
    expect(txUserRepo.assignRole).toHaveBeenCalledWith(created.id, `role-${expected}`)
    expect(result.role).toBe(expected)
  })

  // ── UTCID07 — mixed-case email normalized ──
  test('UTCID07: looks up the raw email but stores the lowercased address', async () => {
    await useCase.execute(INPUT({ email: 'New.Lecturer@FPT.EDU.VN' }) as any)

    expect(userRepo.findByEmail).toHaveBeenCalledWith('New.Lecturer@FPT.EDU.VN')
    expect(txUserRepo.create.mock.calls[0][0].email).toBe('new.lecturer@fpt.edu.vn')
  })

  // ── UTCID08 — role row missing → account still created, no assignment ──
  test('UTCID08: still creates the account when the role row is missing, skipping assignment', async () => {
    txUserRepo.findRoleByName.mockResolvedValue(null)

    const result = await useCase.execute(INPUT() as any)

    expect(txUserRepo.create).toHaveBeenCalledTimes(1)
    expect(txUserRepo.assignRole).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('Role not found in DB: LECTURER')
    // The DTO still reports the requested role even though no assignment row exists.
    expect(result.role).toBe('lecturer')
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID09 — duplicate email ──
  test('UTCID09: rejects a duplicate email with ConflictError before hashing or opening a transaction', async () => {
    userRepo.findByEmail.mockResolvedValue(
      User.restore('existing-1', 'new.lecturer@fpt.edu.vn', 'hash', 'Existing', null, null, null, null, 'Active', null, null, null, ['LECTURER']),
    )

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: ConflictError,
      message: MESSAGES.USER_EMAIL_EXISTS,
    })
    expect(hashService.hash).not.toHaveBeenCalled()
    expect(uow.runInTransaction).not.toHaveBeenCalled()
    expect(txUserRepo.create).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to create user. Email already exists: new.lecturer@fpt.edu.vn',
    )
  })

  // ── UTCID10 — the duplicate-check lookup fails ──
  test('UTCID10: propagates a duplicate-check failure without hashing or a transaction', async () => {
    userRepo.findByEmail.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute(INPUT() as any)).rejects.toThrow('DB connection lost')

    expect(hashService.hash).not.toHaveBeenCalled()
    expect(uow.runInTransaction).not.toHaveBeenCalled()
  })

  // ── UTCID11 — hashing fails ──
  test('UTCID11: propagates a hashing failure and never opens the transaction', async () => {
    hashService.hash.mockRejectedValue(new Error('bcrypt unavailable'))

    await expect(useCase.execute(INPUT() as any)).rejects.toThrow('bcrypt unavailable')

    expect(uow.runInTransaction).not.toHaveBeenCalled()
    expect(txUserRepo.create).not.toHaveBeenCalled()
  })

  // ── UTCID12 — the user insert fails ──
  test('UTCID12: aborts when the user insert fails, never looking up the role', async () => {
    txUserRepo.create.mockRejectedValue(new Error('unique constraint violated'))

    await expect(useCase.execute(INPUT() as any)).rejects.toThrow('unique constraint violated')

    expect(txUserRepo.findRoleByName).not.toHaveBeenCalled()
    expect(txUserRepo.assignRole).not.toHaveBeenCalled()
  })

  // ── UTCID13 — the role lookup fails ──
  test('UTCID13: aborts when the role lookup fails, never assigning a role', async () => {
    txUserRepo.findRoleByName.mockRejectedValue(new Error('role table unavailable'))

    await expect(useCase.execute(INPUT() as any)).rejects.toThrow('role table unavailable')

    expect(txUserRepo.create).toHaveBeenCalledTimes(1)
    expect(txUserRepo.assignRole).not.toHaveBeenCalled()
  })

  // ── UTCID14 — the role assignment fails ──
  test('UTCID14: propagates a role-assignment failure', async () => {
    txUserRepo.assignRole.mockRejectedValue(new Error('role assignment failed'))

    await expect(useCase.execute(INPUT() as any)).rejects.toThrow('role assignment failed')

    expect(txUserRepo.create).toHaveBeenCalledTimes(1)
  })

  // ── UTCID15 — the transaction itself fails ──
  test('UTCID15: propagates a transaction failure so nothing is committed', async () => {
    uow.runInTransaction.mockRejectedValue(new Error('transaction rolled back'))

    await expect(useCase.execute(INPUT() as any)).rejects.toThrow('transaction rolled back')

    expect(hashService.hash).toHaveBeenCalledTimes(1)
    expect(txUserRepo.create).not.toHaveBeenCalled()
  })
})
