/**
 * Unit Tests — FO10 / ToggleLock  (ToggleLockUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "ToggleLock"):
 *   UTCID01 (N) — Lock an active account          → status Inactive, saved, DTO reflects it
 *   UTCID02 (N) — Unlock an inactive account      → status Active, saved, DTO reflects it
 *   UTCID03 (N) — Side-effects                    → same entity saved exactly once
 *   UTCID04 (B) — Lock an already-locked account  → idempotent, still saved
 *   UTCID05 (B) — Unlock an already-active account→ idempotent, still saved
 *   UTCID06 (B) — Locking raises the domain event → UserDeactivatedEvent recorded
 *   UTCID07 (B) — Unlocking raises NO event       → asymmetry, documented as-built
 *   UTCID08 (B) — Unlocking a SUSPENDED account   → collapses to Active, suspension lost
 *   UTCID09 (A) — User not found                  → NotFoundError, nothing saved
 *   UTCID10 (A) — Lookup failure                  → propagates, nothing saved
 *   UTCID11 (A) — Save failure                    → propagates after the entity was mutated
 *
 * Requirement (FO10): ToggleLockUseCase.execute loads the user by id and fails with
 * NotFoundError when it does not exist. Otherwise `locked=true` calls deactivate()
 * (status → Inactive) and `locked=false` calls activate() (status → Active); the user is
 * persisted and returned as a UserResponseDto.
 *
 * ⚠️ Two as-built behaviours worth review, locked in by UTCID07 and UTCID08:
 *  - deactivate() raises a UserDeactivatedEvent but activate() raises NOTHING, so unlocking
 *    leaves no domain-event trail while locking does.
 *  - The status field has three values (Active / Inactive / Suspended) but this endpoint only
 *    toggles two, so unlocking a SUSPENDED account silently turns it Active and the
 *    suspension is lost.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { ToggleLockUseCase } from './toggle-lock.use-case.js'
import { User, UserDeactivatedEvent, UserRoleType, UserStatusType } from '../../../auth/domain/entities/user.entity.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

function makeUser(over: { id?: string; status?: UserStatusType | null; roles?: UserRoleType[] } = {}): User {
  return User.restore(
    over.id ?? 'user-1',
    'student@fpt.edu.vn',
    'stored-hash',
    'Test Student',
    null, null, null, null,
    over.status === undefined ? 'Active' : over.status,
    null, null, null,
    over.roles ?? ['STUDENT'],
  )
}

const events = (u: User): unknown[] => ((u as any).domainEvents ?? []) as unknown[]

describe('FO10 / ToggleLock — ToggleLockUseCase.execute', () => {
  let userRepo: {
    findById: jest.Mock<(id: string) => Promise<User | null>>
    save: jest.Mock<(u: User) => Promise<void>>
  }
  let logger: {
    info: jest.Mock<(m: string) => void>
    warn: jest.Mock<(m: string) => void>
    debug: jest.Mock<(m: string) => void>
    error: jest.Mock<(m: string) => void>
    createChild: jest.Mock<() => unknown>
  }
  let useCase: ToggleLockUseCase

  beforeEach(() => {
    userRepo = {
      findById: jest.fn<(id: string) => Promise<User | null>>(),
      save: jest.fn<(u: User) => Promise<void>>().mockResolvedValue(undefined),
    }
    logger = {
      info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn(), createChild: jest.fn(),
    }
    useCase = new ToggleLockUseCase(userRepo as any, logger as any)
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — lock an active account ──
  test('UTCID01: locks an active account, setting it Inactive', async () => {
    const user = makeUser({ status: 'Active' })
    userRepo.findById.mockResolvedValue(user)

    const result = await useCase.execute({ id: 'user-1', locked: true })

    expect(user.status).toBe('Inactive')
    expect(result.status).toBe('inactive')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID02 — unlock an inactive account ──
  test('UTCID02: unlocks an inactive account, setting it Active', async () => {
    const user = makeUser({ status: 'Inactive' })
    userRepo.findById.mockResolvedValue(user)

    const result = await useCase.execute({ id: 'user-1', locked: false })

    expect(user.status).toBe('Active')
    expect(result.status).toBe('active')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID03 — the mutated entity itself is persisted, once ──
  test('UTCID03: saves the same entity it mutated, exactly once', async () => {
    const user = makeUser({ id: 'user-42', status: 'Active' })
    userRepo.findById.mockResolvedValue(user)

    const result = await useCase.execute({ id: 'user-42', locked: true })

    expect(userRepo.findById).toHaveBeenCalledWith('user-42')
    const saved = userRepo.save.mock.calls[0][0]
    expect(saved).toBe(user)
    expect(saved.status).toBe('Inactive')
    expect(result.id).toBe('user-42')
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — locking an already-locked account ──
  test('UTCID04: locking an already-inactive account is idempotent but still writes', async () => {
    const user = makeUser({ status: 'Inactive' })
    userRepo.findById.mockResolvedValue(user)

    const result = await useCase.execute({ id: 'user-1', locked: true })

    expect(user.status).toBe('Inactive')
    expect(result.status).toBe('inactive')
    // No short-circuit exists: the save happens regardless.
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID05 — unlocking an already-active account ──
  test('UTCID05: unlocking an already-active account is idempotent but still writes', async () => {
    const user = makeUser({ status: 'Active' })
    userRepo.findById.mockResolvedValue(user)

    await useCase.execute({ id: 'user-1', locked: false })

    expect(user.status).toBe('Active')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ── UTCID06 — locking records a domain event ──
  test('UTCID06: raises UserDeactivatedEvent when locking', async () => {
    const user = makeUser({ status: 'Active' })
    userRepo.findById.mockResolvedValue(user)

    await useCase.execute({ id: 'user-1', locked: true })

    expect(events(user).some((e) => e instanceof UserDeactivatedEvent)).toBe(true)
  })

  // ── UTCID07 — unlocking records NOTHING (asymmetry) ──
  test('UTCID07: raises no domain event when unlocking', async () => {
    const user = makeUser({ status: 'Inactive' })
    userRepo.findById.mockResolvedValue(user)

    await useCase.execute({ id: 'user-1', locked: false })

    // activate() sets the status but adds no event — locking is traceable, unlocking is not.
    expect(user.status).toBe('Active')
    expect(events(user)).toHaveLength(0)
  })

  // ── UTCID08 — a SUSPENDED account is collapsed to Active by an unlock ──
  test('UTCID08: unlocking a suspended account turns it Active, discarding the suspension', async () => {
    const user = makeUser({ status: 'Suspended' })
    userRepo.findById.mockResolvedValue(user)

    const result = await useCase.execute({ id: 'user-1', locked: false })

    // Suspended is a distinct status, but this endpoint only knows Active/Inactive.
    expect(user.status).toBe('Active')
    expect(result.status).toBe('active')
    expect(userRepo.save).toHaveBeenCalledTimes(1)
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID09 — unknown user ──
  test('UTCID09: rejects an unknown user with NotFoundError and saves nothing', async () => {
    userRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute({ id: 'missing', locked: true })).rejects.toMatchObject({
      constructor: NotFoundError,
      message: MESSAGES.USER_NOT_FOUND,
    })
    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID10 — lookup failure ──
  test('UTCID10: propagates a lookup failure without saving', async () => {
    userRepo.findById.mockRejectedValue(new Error('DB connection lost'))

    await expect(useCase.execute({ id: 'user-1', locked: true })).rejects.toThrow('DB connection lost')

    expect(userRepo.save).not.toHaveBeenCalled()
  })

  // ── UTCID11 — save failure after the entity was already mutated ──
  test('UTCID11: propagates a save failure, leaving the change unpersisted', async () => {
    const user = makeUser({ status: 'Active' })
    userRepo.findById.mockResolvedValue(user)
    userRepo.save.mockRejectedValue(new Error('DB write failed'))

    await expect(useCase.execute({ id: 'user-1', locked: true })).rejects.toThrow('DB write failed')

    // The in-memory entity was already changed; nothing rolls it back.
    expect(user.status).toBe('Inactive')
  })
})
