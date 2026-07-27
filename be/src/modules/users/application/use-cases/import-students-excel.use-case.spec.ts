/**
 * Unit Tests — FO12 / ImportStudentsExcel  (ImportStudentsExcelUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "ImportStudentsExcel"):
 *   UTCID01 (N) — New student, season exists          → user created, enrolled, batch COMPLETED
 *   UTCID02 (N) — New-account side effects            → 8-hex password, bcrypt(10), RequirePasswordChange
 *   UTCID03 (N) — Student already exists              → no create, no account email, enrolment mail only
 *   UTCID04 (N) — Several rows, mixed outcome         → success/error counted independently per row
 *   UTCID05 (B) — Filename keyword variants           → student / sv / hs / sinh vien / hoc_sinh accepted
 *   UTCID06 (B) — Season absent from DB               → auto-creates 9 semesters + links subjects
 *   UTCID07 (B) — Semester fuzzy match by number      → "1" resolves to the season's "Kỳ 1"
 *   UTCID08 (B) — Semester number with no match       → normalised to "Kỳ N", main class not enrolled
 *   UTCID09 (B) — Extra classes (học vượt / ngoài kỳ) → "SUB-CLS" parsed, bare token ignored
 *   UTCID10 (B) — Retake format 1 (SUB-CLS)           → declared class located and enrolled
 *   UTCID11 (B) — Retake format 2 (parallel column)   → fewer classes than subjects reuses the first
 *   UTCID12 (B) — Retake format 1, class missing      → class auto-created in the linking semester
 *   UTCID13 (B) — Avatar URL supplied                 → uploaded for new user, updated for existing
 *   UTCID14 (B) — Duplicate pending / enrolment rows  → nothing written twice, class list deduped
 *   UTCID15 (B) — Same subject+semester, other class  → old enrolment deleted, submissions moved
 *   UTCID16 (B) — Sync deletion                       → stale roster entries removed + pending Cancelled
 *   UTCID17 (A) — Filename without a student keyword  → INVALID_FILE_NAME 400, no batch created
 *   UTCID18 (A) — Season not detectable               → INVALID_SEASON 400, no batch created
 *   UTCID19 (A) — Workbook with no sheet              → INVALID_FILE 400, batch marked FAILED
 *   UTCID20 (A) — STUDENT role not configured         → SYSTEM_ERROR 500, batch marked FAILED
 *   UTCID21 (A) — Row missing a required field        → row error recorded, batch still COMPLETED
 *   UTCID22 (A) — Avatar upload fails                 → warning only, row succeeds with Avatar null
 *   UTCID23 (A) — Retake subject unknown              → skipped with a warning, row still succeeds
 *   UTCID24 (A) — Enrolment email fails               → row counted as an error
 *   UTCID25 (A) — Sync-deletion step throws           → swallowed, batch still COMPLETED
 *   UTCID26 (A) — Error details longer than 3900      → persisted truncated
 *
 * Requirement (FO12): ImportStudentsExcelUseCase.execute ingests an Excel roster. It first
 * validates that the file name carries a student keyword and a detectable season, resolves (or
 * auto-creates) that season's semesters, opens an ImportBatch, then processes every row
 * independently: it resolves the semester, creates the account when the MSSV/email is new,
 * records pending enrolments for the main class, the extra ("học vượt / ngoài kỳ") classes and
 * the retake subjects, enrols the student into every class it can locate or auto-create, and
 * mails the credentials and the class list. A failing row is counted and reported without
 * aborting the import; afterwards a sync pass removes students who are no longer on a roster and
 * the batch is closed as COMPLETED.
 *
 * As-built notes captured by these cases (behaviour is documented, NOT corrected):
 *   - A row that fails midway is counted as an error, but the writes it already made
 *     (user, pending enrolments, enrolments) are NOT rolled back — UTCID24.
 *   - The sync-deletion pass is wrapped in a catch-all that only logs, so a failure there is
 *     invisible in the batch result — UTCID25.
 *   - An avatar that cannot be uploaded degrades silently to null — UTCID22.
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'

// ── Module mocks — the use-case owns a module-level `new PrismaClient()` and pulls
//    xlsx / bcryptjs / Cloudinary in directly, so they must be replaced before import.
const prisma: any = {}

const xlsxRead = jest.fn<(...a: any[]) => any>()
const sheetToJson = jest.fn<(...a: any[]) => any>()
const bcryptHash = jest.fn<(...a: any[]) => Promise<string>>()
const uploadImageFromUrl = jest.fn<(...a: any[]) => Promise<string>>()

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: class {
    constructor() {
      return prisma
    }
  },
}))
jest.unstable_mockModule('xlsx', () => ({
  read: xlsxRead,
  utils: { sheet_to_json: sheetToJson },
}))
jest.unstable_mockModule('bcryptjs', () => ({
  default: { hash: bcryptHash },
}))
jest.unstable_mockModule('../../../../shared/infrastructure/services/cloudinary.service.js', () => ({
  CloudinaryService: { uploadImageFromUrl },
}))

const { ImportStudentsExcelUseCase } = await import('./import-students-excel.use-case.js')
const { AppError } = await import('../../../../shared/application/app.error.js')

// ── Fixtures ─────────────────────────────────────────────────────────────────
const SEM = { Id: 'sem-1', Code: 'Kỳ 1', Season: 'Fall 2026', IsActive: true, StartDate: null, EndDate: null }
const FILE = 'Student_Fall2026.xlsx'

const ROW = (over: Record<string, unknown> = {}) => ({
  MSSV: 'HE180001',
  'Họ và tên': 'Nguyen Van A',
  Email: 'a.he180001@fpt.edu.vn',
  'Số điện thoại': '0900000001',
  'Kỳ học': 'Kỳ 1',
  'Lớp học': 'SE1801',
  ...over,
})

const INPUT = (over: Partial<{ fileName: string }> = {}) => ({
  fileBuffer: Buffer.from('fake-xlsx'),
  fileName: over.fileName ?? FILE,
  fileUrl: 'https://cdn.aita/uploads/student_fall2026.xlsx',
  importedByUserId: 'admin-1',
})

/** Class row returned by the enrolment loop's `findUnique` (with relations). */
const CLASS_FULL = (over: Record<string, unknown> = {}) => ({
  Id: 'class-1',
  ClassCode: 'SE1801',
  SubjectId: 'subj-1',
  SemesterId: 'sem-1',
  Subject: { Id: 'subj-1', SubjectCode: 'PRF192' },
  Semester: { Id: 'sem-1', Code: 'Kỳ 1' },
  InstructorClass: [],
  ...over,
})

describe('FO12 / ImportStudentsExcel — ImportStudentsExcelUseCase.execute', () => {
  let emailService: { sendEmail: jest.Mock<(...a: any[]) => Promise<void>> }
  let useCase: InstanceType<typeof ImportStudentsExcelUseCase>
  let rows: any[]
  /** Roster returned by the sync pass, keyed by class id. */
  let roster: Record<string, Array<{ UserId: string }>>
  /** Enrolments the "same subject+semester" replacement step should find. */
  let oldClasses: Array<{ ClassId: string; UserId: string }>
  let warnSpy: any
  let logSpy: any
  let errorSpy: any

  beforeEach(() => {
    jest.clearAllMocks()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    rows = [ROW()]
    roster = {}
    oldClasses = []

    xlsxRead.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })
    sheetToJson.mockImplementation(() => rows)
    bcryptHash.mockResolvedValue('hashed-pw')
    uploadImageFromUrl.mockResolvedValue('https://cdn.aita/avatars/a.png')

    prisma.semester = {
      findMany: jest.fn<(...a: any[]) => Promise<any[]>>().mockResolvedValue([SEM]),
      create: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
    }
    prisma.subject = {
      findMany: jest.fn<(...a: any[]) => Promise<any[]>>().mockResolvedValue([]),
      findUnique: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(null),
    }
    prisma.semesterSubject = {
      findMany: jest.fn<(...a: any[]) => Promise<any[]>>().mockResolvedValue([]),
      findFirst: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(null),
      createMany: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
    }
    prisma.importBatch = {
      create: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({ Id: 'batch-1' }),
      update: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({ Id: 'batch-1' }),
    }
    prisma.role = {
      findUnique: jest
        .fn<(...a: any[]) => Promise<any>>()
        .mockResolvedValue({ Id: 'role-student', RoleName: 'STUDENT' }),
    }
    prisma.user = {
      findFirst: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(null),
      create: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({ Id: 'user-1' }),
      update: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({ Id: 'user-1' }),
    }
    prisma.pendingEnrollment = {
      findFirst: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(null),
      create: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
      updateMany: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
    }
    prisma.class = {
      // Main-class lookup and the sync pass share this call.
      findMany: jest
        .fn<(...a: any[]) => Promise<any[]>>()
        .mockResolvedValue([{ Id: 'class-1', SubjectId: 'subj-1' }]),
      findFirst: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(null),
      findUnique: jest.fn<(...a: any[]) => Promise<any>>().mockImplementation(async () => CLASS_FULL()),
      create: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({ Id: 'class-new' }),
    }
    prisma.studentClass = {
      // Two different queries hit this: the roster read (where.ClassId) during the
      // sync pass, and the "other class, same subject+semester" read during enrolment.
      findMany: jest.fn<(...a: any[]) => Promise<any[]>>().mockImplementation(async (args: any) => {
        const where = args?.where ?? {}
        if (typeof where.ClassId === 'string') return roster[where.ClassId] ?? []
        return oldClasses
      }),
      findUnique: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue(null),
      create: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
      delete: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
      deleteMany: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
    }
    prisma.submission = {
      updateMany: jest.fn<(...a: any[]) => Promise<any>>().mockResolvedValue({}),
    }
    prisma.$transaction = jest.fn<(...a: any[]) => Promise<any>>().mockImplementation(async (cb: any) =>
      cb({
        semester: prisma.semester,
        subject: prisma.subject,
        semesterSubject: prisma.semesterSubject,
      }),
    )

    emailService = { sendEmail: jest.fn<(...a: any[]) => Promise<void>>().mockResolvedValue(undefined) }
    useCase = new ImportStudentsExcelUseCase(emailService as any)
  })

  afterEach(() => {
    warnSpy.mockRestore()
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  /** Final `importBatch.update` payload — the one carrying Status COMPLETED/FAILED. */
  const finalBatchData = () => {
    const calls = prisma.importBatch.update.mock.calls
    return calls[calls.length - 1][0].data
  }

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — happy path ──
  test('UTCID01: imports a new student, enrols them and closes the batch as COMPLETED', async () => {
    const result = await useCase.execute(INPUT() as any)

    expect(result).toMatchObject({
      batchId: 'batch-1',
      detectedSeason: 'Fall 2026',
      totalProcessed: 1,
      successCount: 1,
      errorCount: 0,
      errors: [],
    })

    expect(prisma.user.create).toHaveBeenCalledTimes(1)
    expect(prisma.studentClass.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ UserId: 'user-1', ClassId: 'class-1' }) }),
    )
    // Credentials mail + class mail.
    expect(emailService.sendEmail).toHaveBeenCalledTimes(2)
    expect(finalBatchData()).toMatchObject({ Status: 'COMPLETED', SuccessCount: 1, ErrorCount: 0 })
    // The season already existed, so nothing was auto-created.
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  // ── UTCID02 — what the new account is actually created with ──
  test('UTCID02: creates the account with an 8-char hex password, hashed, and the STUDENT role', async () => {
    await useCase.execute(INPUT() as any)

    const [rawPassword, rounds] = bcryptHash.mock.calls[0] as [string, number]
    expect(rawPassword).toMatch(/^[0-9a-f]{8}$/)
    expect(rounds).toBe(10)

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        StudentCode: 'HE180001',
        FullName: 'Nguyen Van A',
        Email: 'a.he180001@fpt.edu.vn',
        Phone: '0900000001',
        Avatar: null,
        PasswordHash: 'hashed-pw',
        Status: 'Active',
        RequirePasswordChange: true,
        UserRole: { create: expect.objectContaining({ RoleId: 'role-student' }) },
      }),
    })

    // The plain-text password is what gets mailed out.
    const [to, subject, body] = emailService.sendEmail.mock.calls[0] as [string, string, string]
    expect(to).toBe('a.he180001@fpt.edu.vn')
    expect(subject).toBe('Thông tin tài khoản hệ thống AITA')
    expect(body).toContain(rawPassword)
  })

  // ── UTCID03 — student already on the system ──
  test('UTCID03: reuses an existing account and sends only the class-enrolment email', async () => {
    prisma.user.findFirst.mockResolvedValue({ Id: 'user-existing', Email: 'a.he180001@fpt.edu.vn' })

    const result = await useCase.execute(INPUT() as any)

    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(bcryptHash).not.toHaveBeenCalled()
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1)
    expect(emailService.sendEmail.mock.calls[0][1]).toBe('Thông báo lớp học hệ thống AITA')
    expect(prisma.studentClass.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ UserId: 'user-existing' }) }),
    )
    expect(result.successCount).toBe(1)
  })

  // ── UTCID04 — rows are independent ──
  test('UTCID04: counts each row independently and keeps going after a bad one', async () => {
    rows = [
      ROW(),
      ROW({ MSSV: 'HE180002', Email: 'b@fpt.edu.vn', 'Lớp học': undefined }), // missing required
      ROW({ MSSV: 'HE180003', Email: 'c@fpt.edu.vn' }),
    ]

    const result = await useCase.execute(INPUT() as any)

    expect(result.totalProcessed).toBe(3)
    expect(result.successCount).toBe(2)
    expect(result.errorCount).toBe(1)
    expect(result.errors).toHaveLength(1)
    // Row index is +2: header row plus zero-based offset.
    expect(result.errors[0]).toContain('Dòng 3 (b@fpt.edu.vn)')
    expect(finalBatchData()).toMatchObject({ Status: 'COMPLETED', SuccessCount: 2, ErrorCount: 1 })
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID05 — every accepted filename keyword ──
  test.each([
    ['Student_Fall2026.xlsx'],
    ['sv_Fall2026.xlsx'],
    ['hs_Fall2026.xlsx'],
    ['sinh viên Fall2026.xlsx'],
    ['hoc_sinh_Fall2026.xlsx'],
  ])('UTCID05: accepts the filename %s', async (fileName) => {
    const result = await useCase.execute(INPUT({ fileName }) as any)
    expect(result.successCount).toBe(1)
  })

  // ── UTCID06 — season missing → auto-create ──
  test('UTCID06: auto-creates the season with 9 semesters and links the matching subjects', async () => {
    prisma.semester.findMany.mockResolvedValue([]) // season absent
    prisma.subject.findMany.mockResolvedValue([{ Id: 'subj-a' }])

    await useCase.execute(INPUT() as any)

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(prisma.semester.create).toHaveBeenCalledTimes(9)
    const codes = prisma.semester.create.mock.calls.map((c: any) => c[0].data.Code)
    expect(codes).toEqual(['Kỳ 1', 'Kỳ 2', 'Kỳ 3', 'Kỳ 4', 'Kỳ 5', 'Kỳ 6', 'Kỳ 7', 'Kỳ 8', 'Kỳ 9'])
    expect(prisma.semester.create.mock.calls[0][0].data).toMatchObject({
      Season: 'Fall 2026',
      IsActive: true,
      StartDate: null,
      EndDate: null,
    })
    // Subjects are looked up per semester index and linked when present.
    expect(prisma.subject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { Semester: 1 } }),
    )
    expect(prisma.semesterSubject.createMany).toHaveBeenCalledTimes(9)
  })

  // ── UTCID07 — semester matched by its number ──
  test('UTCID07: fuzzy-matches a bare semester number onto the season\'s semester code', async () => {
    rows = [ROW({ 'Kỳ học': '1' })]

    await useCase.execute(INPUT() as any)

    // Resolved to "Kỳ 1", so the main class lookup ran against that semester.
    expect(prisma.class.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ SemesterId: 'sem-1', ClassCode: 'SE1801' }) }),
    )
    expect(prisma.pendingEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ SemesterCode: 'Kỳ 1', SubjectCode: null }) }),
    )
  })

  // ── UTCID08 — semester number the season does not have ──
  test('UTCID08: normalises an unmatched semester number to "Kỳ N" and enrols no main class', async () => {
    rows = [ROW({ 'Kỳ học': 'Kỳ 7' })]

    const result = await useCase.execute(INPUT() as any)

    expect(prisma.pendingEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ SemesterCode: 'Kỳ 7' }) }),
    )
    // No semester in the season carries that code → the main class is never looked up.
    expect(prisma.class.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ClassCode: 'SE1801', SemesterId: 'sem-1' }) }),
    )
    expect(prisma.studentClass.create).not.toHaveBeenCalled()
    // The row still counts as a success — the pending enrolment is the deliverable.
    expect(result.successCount).toBe(1)
  })

  // ── UTCID09 — extra ("học vượt / ngoài kỳ") classes ──
  test('UTCID09: parses SUBJECT-CLASS extra entries and ignores tokens without a hyphen', async () => {
    rows = [ROW({ 'Môn đã học vượt thành công': 'PRO192-SE1802, BARETOKEN' })]

    await useCase.execute(INPUT() as any)

    const pending = prisma.pendingEnrollment.create.mock.calls.map((c: any) => c[0].data)
    expect(pending).toContainEqual(
      expect.objectContaining({ SubjectCode: 'PRO192', ClassCode: 'SE1802', SemesterCode: null, Season: 'Fall 2026' }),
    )
    expect(pending.some((p: any) => p.SubjectCode === 'BARETOKEN')).toBe(false)
    // Main class + the one valid extra entry.
    expect(pending).toHaveLength(2)
  })

  // ── UTCID10 — retake declared as SUBJECT-CLASS ──
  test('UTCID10: enrols a retake declared in the hyphen format into the class it names', async () => {
    rows = [ROW({ 'Nợ môn': 'PRO232-SE17C01' })]
    prisma.subject.findUnique.mockResolvedValue({ Id: 'subj-pro232', SubjectCode: 'PRO232' })
    prisma.class.findFirst.mockResolvedValue({ Id: 'class-retake', SemesterId: 'sem-old' })

    await useCase.execute(INPUT() as any)

    // Retake lookup is deliberately NOT scoped to the detected season.
    expect(prisma.class.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ClassCode: 'SE17C01', SubjectId: 'subj-pro232' },
        select: { Id: true, SemesterId: true },
      }),
    )
    const enrolled = prisma.studentClass.create.mock.calls.map((c: any) => c[0].data.ClassId)
    expect(enrolled).toContain('class-retake')
    // The in-memory retake flags never reach the table.
    for (const call of prisma.pendingEnrollment.create.mock.calls) {
      expect(call[0].data).not.toHaveProperty('IsRetake')
      expect(call[0].data).not.toHaveProperty('RetakeClassCode')
    }
  })

  // ── UTCID11 — retake with a parallel "Lớp nợ môn" column ──
  test('UTCID11: maps retake subjects onto the parallel class column, reusing the first when short', async () => {
    rows = [ROW({ 'Nợ môn': 'PRO232 MAE101', 'Lớp nợ môn': 'SE17C01' })]
    prisma.subject.findUnique.mockImplementation(async (args: any) => ({
      Id: `subj-${args.where.SubjectCode}`,
      SubjectCode: args.where.SubjectCode,
    }))
    prisma.class.findFirst.mockImplementation(async (args: any) => ({
      Id: `class-${args.where.SubjectId}`,
      SemesterId: 'sem-old',
    }))

    await useCase.execute(INPUT() as any)

    // Only one class code was supplied, so the second subject falls back to it.
    const lookups = prisma.class.findFirst.mock.calls.map((c: any) => c[0].where)
    expect(lookups).toContainEqual({ ClassCode: 'SE17C01', SubjectId: 'subj-PRO232' })
    expect(lookups).toContainEqual({ ClassCode: 'SE17C01', SubjectId: 'subj-MAE101' })
  })

  // ── UTCID12 — retake class does not exist yet ──
  test('UTCID12: auto-creates the retake class in the semester that links the subject', async () => {
    rows = [ROW({ 'Nợ môn': 'PRO232', 'Lớp nợ môn': 'SE17C01' })]
    prisma.subject.findUnique.mockResolvedValue({ Id: 'subj-pro232', SubjectCode: 'PRO232' })
    prisma.class.findFirst.mockResolvedValue(null) // nothing on the system
    prisma.semesterSubject.findFirst.mockResolvedValue({ SubjectId: 'subj-pro232', SemesterId: 'sem-1' })

    await useCase.execute(INPUT() as any)

    expect(prisma.class.create).toHaveBeenCalledWith({
      data: { ClassCode: 'SE17C01', SubjectId: 'subj-pro232', SemesterId: 'sem-1', Status: 'Active' },
    })
    const enrolled = prisma.studentClass.create.mock.calls.map((c: any) => c[0].data.ClassId)
    expect(enrolled).toContain('class-new')
  })

  // ── UTCID13 — avatar handling for both paths ──
  test('UTCID13: uploads the avatar for a new student and updates it for an existing one', async () => {
    rows = [ROW({ Avatar: 'https://drive.example/a.png' })]

    await useCase.execute(INPUT() as any)

    expect(uploadImageFromUrl).toHaveBeenCalledWith('https://drive.example/a.png')
    expect(prisma.user.create.mock.calls[0][0].data.Avatar).toBe('https://cdn.aita/avatars/a.png')

    // Same row, but the student already exists → update instead of create.
    jest.clearAllMocks()
    prisma.user.findFirst.mockResolvedValue({ Id: 'user-existing' })
    uploadImageFromUrl.mockResolvedValue('https://cdn.aita/avatars/a.png')

    await useCase.execute(INPUT() as any)

    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { Id: 'user-existing' },
      data: { Avatar: 'https://cdn.aita/avatars/a.png' },
    })
  })

  // ── UTCID14 — re-running the same import writes nothing twice ──
  test('UTCID14: skips pending enrolments and class enrolments that already exist', async () => {
    prisma.pendingEnrollment.findFirst.mockResolvedValue({ Id: 'pe-1' })
    prisma.studentClass.findUnique.mockResolvedValue({ UserId: 'user-1', ClassId: 'class-1' })
    // Main lookup returns the same class twice — the list is deduped before enrolling.
    prisma.class.findMany.mockResolvedValue([
      { Id: 'class-1', SubjectId: 'subj-1' },
      { Id: 'class-1', SubjectId: 'subj-1' },
    ])

    const result = await useCase.execute(INPUT() as any)

    expect(prisma.pendingEnrollment.create).not.toHaveBeenCalled()
    expect(prisma.studentClass.create).not.toHaveBeenCalled()
    expect(prisma.class.findUnique).toHaveBeenCalledTimes(1)
    expect(result.successCount).toBe(1)
  })

  // ── UTCID15 — student moved between classes of the same subject+semester ──
  test('UTCID15: removes the previous class of the same subject+semester and moves its submissions', async () => {
    oldClasses = [{ ClassId: 'class-old', UserId: 'user-1' }]

    await useCase.execute(INPUT() as any)

    expect(prisma.studentClass.delete).toHaveBeenCalledWith({
      where: { UserId_ClassId: { UserId: 'user-1', ClassId: 'class-old' } },
    })
    expect(prisma.submission.updateMany).toHaveBeenCalledWith({
      where: { StudentId: 'user-1', ClassId: 'class-old' },
      data: { ClassId: 'class-1' },
    })
    expect(prisma.studentClass.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ClassId: 'class-1' }) }),
    )
  })

  // ── UTCID16 — sync deletion drops students no longer on the sheet ──
  test('UTCID16: removes roster members absent from the import and cancels their pending rows', async () => {
    roster = { 'class-1': [{ UserId: 'user-1' }, { UserId: 'user-stale' }] }

    await useCase.execute(INPUT() as any)

    expect(prisma.studentClass.deleteMany).toHaveBeenCalledWith({
      where: { ClassId: 'class-1', UserId: { in: ['user-stale'] } },
    })
    expect(prisma.pendingEnrollment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ UserId: { in: ['user-stale'] }, ClassCode: 'SE1801' }),
        data: { Status: 'Cancelled' },
      }),
    )
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID17 — filename without a student keyword ──
  test('UTCID17: rejects a filename with no student keyword before touching anything', async () => {
    await expect(useCase.execute(INPUT({ fileName: 'Fall2026_roster.xlsx' }) as any)).rejects.toMatchObject({
      constructor: AppError,
      code: 'INVALID_FILE_NAME',
      statusCode: 400,
    })

    expect(prisma.semester.findMany).not.toHaveBeenCalled()
    expect(prisma.importBatch.create).not.toHaveBeenCalled()
  })

  // ── UTCID18 — season cannot be detected ──
  test('UTCID18: rejects a filename with no detectable season and creates no batch', async () => {
    await expect(useCase.execute(INPUT({ fileName: 'students.xlsx' }) as any)).rejects.toMatchObject({
      constructor: AppError,
      code: 'INVALID_SEASON',
      statusCode: 400,
    })

    expect(prisma.importBatch.create).not.toHaveBeenCalled()
  })

  // ── UTCID19 — workbook carries no sheet ──
  test('UTCID19: fails an empty workbook and marks the batch FAILED', async () => {
    xlsxRead.mockReturnValue({ SheetNames: [], Sheets: {} })

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      code: 'INVALID_FILE',
      statusCode: 400,
    })

    expect(prisma.importBatch.create).toHaveBeenCalledTimes(1)
    expect(finalBatchData()).toMatchObject({ Status: 'FAILED' })
  })

  // ── UTCID20 — STUDENT role not configured ──
  test('UTCID20: fails with SYSTEM_ERROR when the STUDENT role row is missing', async () => {
    prisma.role.findUnique.mockResolvedValue(null)

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      code: 'SYSTEM_ERROR',
      statusCode: 500,
    })

    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(finalBatchData()).toMatchObject({ Status: 'FAILED' })
  })

  // ── UTCID21 — a row is missing a mandatory column ──
  test('UTCID21: records a row missing mandatory fields as an error without aborting the import', async () => {
    rows = [ROW({ Email: undefined })]

    const result = await useCase.execute(INPUT() as any)

    expect(result.successCount).toBe(0)
    expect(result.errorCount).toBe(1)
    expect(result.errors[0]).toBe('Dòng 2 (Không rõ): Thiếu thông tin bắt buộc (MSSV, Họ và tên, Email, Kỳ học, Lớp học)')
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(finalBatchData()).toMatchObject({ Status: 'COMPLETED' })
  })

  // ── UTCID22 — the avatar upload blows up ──
  test('UTCID22: degrades a failing avatar upload to null and still imports the row', async () => {
    rows = [ROW({ Avatar: 'https://drive.example/broken.png' })]
    uploadImageFromUrl.mockRejectedValue(new Error('cloudinary down'))

    const result = await useCase.execute(INPUT() as any)

    expect(result.successCount).toBe(1)
    expect(prisma.user.create.mock.calls[0][0].data.Avatar).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
  })

  // ── UTCID23 — retake references a subject that does not exist ──
  test('UTCID23: skips a retake whose subject is unknown and still completes the row', async () => {
    rows = [ROW({ 'Nợ môn': 'GHOST101-SE17C01' })]
    prisma.subject.findUnique.mockResolvedValue(null)

    const result = await useCase.execute(INPUT() as any)

    expect(result.successCount).toBe(1)
    expect(result.errorCount).toBe(0)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('GHOST101'))
    // Only the main class was enrolled.
    const enrolled = prisma.studentClass.create.mock.calls.map((c: any) => c[0].data.ClassId)
    expect(enrolled).toEqual(['class-1'])
  })

  // ── UTCID24 — the mail step fails ──
  test('UTCID24: counts the row as an error when the email fails, leaving earlier writes in place', async () => {
    emailService.sendEmail.mockRejectedValue(new Error('SMTP unavailable'))

    const result = await useCase.execute(INPUT() as any)

    expect(result.successCount).toBe(0)
    expect(result.errorCount).toBe(1)
    expect(result.errors[0]).toContain('SMTP unavailable')
    // As-built: the account and the enrolment are NOT rolled back.
    expect(prisma.user.create).toHaveBeenCalledTimes(1)
    expect(prisma.studentClass.create).toHaveBeenCalledTimes(1)
    expect(finalBatchData()).toMatchObject({ Status: 'COMPLETED', SuccessCount: 0, ErrorCount: 1 })
  })

  // ── UTCID25 — the sync pass throws ──
  test('UTCID25: swallows a sync-deletion failure and still reports the batch as COMPLETED', async () => {
    roster = { 'class-1': [{ UserId: 'user-stale' }] }
    prisma.studentClass.deleteMany.mockRejectedValue(new Error('deadlock on StudentClass'))

    const result = await useCase.execute(INPUT() as any)

    expect(result.successCount).toBe(1)
    expect(result.errorCount).toBe(0)
    expect(errorSpy).toHaveBeenCalledWith('Failed to sync deletions:', expect.any(Error))
    expect(finalBatchData()).toMatchObject({ Status: 'COMPLETED' })
  })

  // ── UTCID26 — the error blob is too large for the column ──
  test('UTCID26: truncates the persisted error details past 3900 characters', async () => {
    // 60 failing rows, each carrying a long email, overflows the 3900-char cap.
    const long = 'x'.repeat(80)
    rows = Array.from({ length: 60 }, (_, i) => ROW({ Email: `${long}${i}@fpt.edu.vn`, 'Lớp học': undefined }))

    const result = await useCase.execute(INPUT() as any)

    expect(result.errorCount).toBe(60)
    const details = finalBatchData().ErrorDetails as string
    expect(details.endsWith('... (truncated)')).toBe(true)
    expect(details).toHaveLength(3900 + '... (truncated)'.length)
    // The returned payload keeps the full list — only the stored copy is trimmed.
    expect(result.errors).toHaveLength(60)
  })
})
