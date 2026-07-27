/**
 * Unit Tests — FO13 / PreviewImportStudents  (PreviewImportStudentsExcelUseCase.execute)
 *
 * Report 5 mapping (docs/AITA_Report5_UnitTest_Functions.xlsx → sheet "PreviewImportStudents"):
 *   UTCID01 (N) — One valid row                     → full preview payload, isValid, hasErrors false
 *   UTCID02 (N) — Several valid rows                → totalRows correct, index numbered from 2
 *   UTCID03 (N) — Valid and invalid rows mixed      → hasErrors true, isValid set per row
 *   UTCID04 (B) — Filename keyword variants         → student / sv / hs / sinh vien / hoc_sinh
 *   UTCID05 (B) — DB Season stored in any format    → Fall, Fall2026, "fall 2026", 2026-fall all match
 *   UTCID06 (B) — Semester matched loosely          → bare number and different casing both resolve
 *   UTCID07 (B) — "Mùa" column as fallback          → used when "Kỳ học" is absent
 *   UTCID08 (B) — Padded and numeric cells          → trimmed and coerced to string
 *   UTCID09 (B) — Optional columns absent           → phone and password come back as ''
 *   UTCID10 (A) — Filename with no student keyword  → INVALID_FILE_NAME 400, no DB read
 *   UTCID11 (A) — Season not detectable             → INVALID_SEASON 400, no DB read
 *   UTCID12 (A) — Season absent from the system     → SEASON_NOT_FOUND 404, file never parsed
 *   UTCID13 (A) — Workbook with no sheet            → INVALID_FILE 400 'File Excel không có dữ liệu'
 *   UTCID14 (A) — Sheet with no data row            → INVALID_FILE 400 'File Excel rỗng'
 *   UTCID15 (A) — Row missing every required field  → five "Thiếu ..." messages, row invalid
 *   UTCID16 (A) — Semester outside the season       → row invalid, the typed code is echoed back
 *
 * Requirement (FO13): PreviewImportStudentsExcelUseCase.execute is the dry-run shown to the admin
 * before an actual import. It applies the same file-name and season gates as FO12, but instead of
 * auto-creating anything it REJECTS a season the system does not have. It then parses the sheet and
 * returns one preview row per data row — trimmed values, the semester resolved against that season
 * only, an isValid flag and a per-row list of validation messages — plus an aggregate hasErrors.
 * It performs no writes at all.
 *
 * As-built notes captured by these cases (behaviour is documented, NOT corrected):
 *   - When "Kỳ học" is missing the row reports only "Thiếu Kỳ học"; the season-membership check is
 *     skipped entirely and `semester` comes back as '' — UTCID15.
 *   - A semester outside the detected season is reported as an error but the raw text the admin
 *     typed is still echoed back in `semester`, not blanked — UTCID16.
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'

// The use-case owns a module-level `new PrismaClient()` and imports xlsx directly,
// so both must be replaced before the module is loaded.
const prisma: any = {}
const xlsxRead = jest.fn<(...a: any[]) => any>()
const sheetToJson = jest.fn<(...a: any[]) => any>()

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

const { PreviewImportStudentsExcelUseCase } = await import('./preview-import-students-excel.use-case.js')
const { AppError } = await import('../../../../shared/application/app.error.js')

const SEM = (over: Record<string, unknown> = {}) => ({
  Id: 'sem-1',
  Code: 'Kỳ 1',
  Season: 'Fall 2026',
  IsActive: true,
  ...over,
})

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
  fileName: over.fileName ?? 'Student_Fall2026.xlsx',
})

describe('FO13 / PreviewImportStudents — PreviewImportStudentsExcelUseCase.execute', () => {
  let useCase: InstanceType<typeof PreviewImportStudentsExcelUseCase>
  let rows: any[]

  beforeEach(() => {
    jest.clearAllMocks()
    rows = [ROW()]
    xlsxRead.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })
    sheetToJson.mockImplementation(() => rows)
    prisma.semester = {
      findMany: jest.fn<(...a: any[]) => Promise<any[]>>().mockResolvedValue([SEM()]),
    }
    useCase = new PreviewImportStudentsExcelUseCase()
  })

  // ══ NORMAL ══════════════════════════════════════════════════════
  // ── UTCID01 — one clean row ──
  test('UTCID01: previews a valid row with every field resolved and no errors', async () => {
    const result = await useCase.execute(INPUT() as any)

    expect(result).toMatchObject({ detectedSeason: 'Fall 2026', totalRows: 1, hasErrors: false })
    expect(result.rows[0]).toEqual({
      index: 2,
      mssv: 'HE180001',
      fullName: 'Nguyen Van A',
      email: 'a.he180001@fpt.edu.vn',
      phone: '0900000001',
      semester: 'Kỳ 1',
      className: 'SE1801',
      password: '',
      isValid: true,
      errors: [],
    })
  })

  // ── UTCID02 — row numbering ──
  test('UTCID02: numbers preview rows from 2 so they line up with the spreadsheet', async () => {
    rows = [ROW(), ROW({ MSSV: 'HE180002' }), ROW({ MSSV: 'HE180003' })]

    const result = await useCase.execute(INPUT() as any)

    expect(result.totalRows).toBe(3)
    expect(result.rows.map((r: any) => r.index)).toEqual([2, 3, 4])
    expect(result.hasErrors).toBe(false)
  })

  // ── UTCID03 — one bad row taints the aggregate only ──
  test('UTCID03: flags hasErrors while keeping the valid rows marked valid', async () => {
    rows = [ROW(), ROW({ MSSV: undefined, Email: 'b@fpt.edu.vn' }), ROW({ MSSV: 'HE180003' })]

    const result = await useCase.execute(INPUT() as any)

    expect(result.hasErrors).toBe(true)
    expect(result.rows.map((r: any) => r.isValid)).toEqual([true, false, true])
    expect(result.rows[1].errors).toEqual(['Thiếu MSSV'])
  })

  // ══ BOUNDARY ════════════════════════════════════════════════════
  // ── UTCID04 — every accepted filename keyword ──
  test.each([
    ['Student_Fall2026.xlsx'],
    ['sv_Fall2026.xlsx'],
    ['hs_Fall2026.xlsx'],
    ['sinh viên Fall2026.xlsx'],
    ['hoc_sinh_Fall2026.xlsx'],
  ])('UTCID04: accepts the filename %s', async (fileName) => {
    const result = await useCase.execute(INPUT({ fileName }) as any)
    expect(result.detectedSeason).toBe('Fall 2026')
  })

  // ── UTCID05 — the Season column can be stored a lot of ways ──
  test.each([
    ['Fall'],
    ['Fall2026'],
    ['fall 2026'],
    ['2026-fall'],
    ['Học kỳ Fall 2026'],
  ])('UTCID05: matches a season stored as %s', async (season) => {
    prisma.semester.findMany.mockResolvedValue([SEM({ Season: season })])

    const result = await useCase.execute(INPUT() as any)

    expect(result.rows[0].isValid).toBe(true)
    expect(result.rows[0].semester).toBe('Kỳ 1')
  })

  // ── UTCID06 — loose semester matching ──
  test.each([
    ['1'],
    ['kỳ 1'],
    ['Kì 1'],
    ['Kỳ 1'],
  ])('UTCID06: resolves the semester written as "%s" to its stored code', async (typed) => {
    rows = [ROW({ 'Kỳ học': typed })]

    const result = await useCase.execute(INPUT() as any)

    expect(result.rows[0].semester).toBe('Kỳ 1')
    expect(result.rows[0].isValid).toBe(true)
  })

  // ── UTCID07 — "Mùa" stands in for "Kỳ học" ──
  test('UTCID07: falls back to the "Mùa" column when "Kỳ học" is absent', async () => {
    rows = [ROW({ 'Kỳ học': undefined, 'Mùa': 'Kỳ 1' })]

    const result = await useCase.execute(INPUT() as any)

    expect(result.rows[0].semester).toBe('Kỳ 1')
    expect(result.rows[0].errors).toEqual([])
    expect(result.rows[0].isValid).toBe(true)
  })

  // ── UTCID08 — whitespace and non-string cells ──
  test('UTCID08: trims padded cells and coerces numeric ones to strings', async () => {
    rows = [
      ROW({
        MSSV: 12345,
        'Họ và tên': '  Nguyen Van A  ',
        Email: '  a.he180001@fpt.edu.vn ',
        'Số điện thoại': 900000001,
        'Kỳ học': ' Kỳ 1 ',
        'Lớp học': '  SE1801 ',
      }),
    ]

    const result = await useCase.execute(INPUT() as any)

    expect(result.rows[0]).toMatchObject({
      mssv: '12345',
      fullName: 'Nguyen Van A',
      email: 'a.he180001@fpt.edu.vn',
      phone: '900000001',
      semester: 'Kỳ 1',
      className: 'SE1801',
      isValid: true,
    })
  })

  // ── UTCID09 — the optional columns ──
  test('UTCID09: returns empty strings for the optional phone and password columns', async () => {
    rows = [ROW({ 'Số điện thoại': undefined })]

    const result = await useCase.execute(INPUT() as any)

    expect(result.rows[0].phone).toBe('')
    expect(result.rows[0].password).toBe('')
    // Neither column is mandatory, so the row is still valid.
    expect(result.rows[0].isValid).toBe(true)
  })

  // ══ ABNORMAL ════════════════════════════════════════════════════
  // ── UTCID10 — file name gate ──
  test('UTCID10: rejects a filename with no student keyword before reading anything', async () => {
    await expect(useCase.execute(INPUT({ fileName: 'Fall2026_roster.xlsx' }) as any)).rejects.toMatchObject({
      constructor: AppError,
      code: 'INVALID_FILE_NAME',
      statusCode: 400,
    })

    expect(prisma.semester.findMany).not.toHaveBeenCalled()
    expect(xlsxRead).not.toHaveBeenCalled()
  })

  // ── UTCID11 — season gate ──
  test('UTCID11: rejects a filename with no detectable season before reading anything', async () => {
    await expect(useCase.execute(INPUT({ fileName: 'students.xlsx' }) as any)).rejects.toMatchObject({
      constructor: AppError,
      code: 'INVALID_SEASON',
      statusCode: 400,
    })

    expect(prisma.semester.findMany).not.toHaveBeenCalled()
  })

  // ── UTCID12 — preview refuses to auto-create the season (unlike FO12) ──
  test('UTCID12: rejects a season the system does not have instead of creating it', async () => {
    prisma.semester.findMany.mockResolvedValue([SEM({ Season: 'Spring 2026' })])

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      constructor: AppError,
      code: 'SEASON_NOT_FOUND',
      statusCode: 404,
    })

    // The workbook is never even parsed.
    expect(xlsxRead).not.toHaveBeenCalled()
  })

  // ── UTCID13 — workbook carries no sheet ──
  test('UTCID13: rejects a workbook with no sheet', async () => {
    xlsxRead.mockReturnValue({ SheetNames: [], Sheets: {} })

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      code: 'INVALID_FILE',
      message: 'File Excel không có dữ liệu',
      statusCode: 400,
    })
  })

  // ── UTCID14 — sheet exists but holds no data row ──
  test('UTCID14: rejects a sheet whose only content is the header row', async () => {
    rows = []

    await expect(useCase.execute(INPUT() as any)).rejects.toMatchObject({
      code: 'INVALID_FILE',
      message: 'File Excel rỗng',
      statusCode: 400,
    })
  })

  // ── UTCID15 — everything mandatory is missing ──
  test('UTCID15: lists one message per missing mandatory field and skips the semester check', async () => {
    rows = [{ 'Số điện thoại': '0900000001' }]

    const result = await useCase.execute(INPUT() as any)

    expect(result.hasErrors).toBe(true)
    expect(result.rows[0].errors).toEqual([
      'Thiếu MSSV',
      'Thiếu Họ và tên',
      'Thiếu Email',
      'Thiếu Kỳ học',
      'Thiếu Lớp học',
    ])
    // As-built: with no semester typed the membership check never runs, so no
    // "không tồn tại" message is added and the field comes back blank.
    expect(result.rows[0].errors.some((e: string) => e.includes('không tồn tại'))).toBe(false)
    expect(result.rows[0].semester).toBe('')
    expect(result.rows[0].isValid).toBe(false)
  })

  // ── UTCID16 — semester belongs to another season ──
  test('UTCID16: rejects a semester the detected season does not have but echoes the typed code', async () => {
    rows = [ROW({ 'Kỳ học': 'Kỳ 7' })]

    const result = await useCase.execute(INPUT() as any)

    expect(result.rows[0].isValid).toBe(false)
    expect(result.rows[0].errors).toEqual(['Kỳ học "Kỳ 7" không tồn tại trong mùa Fall 2026'])
    // As-built: the invalid value is echoed back rather than blanked.
    expect(result.rows[0].semester).toBe('Kỳ 7')
    expect(result.hasErrors).toBe(true)
  })
})
