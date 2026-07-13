import { PrismaClient } from '@prisma/client'
import * as xlsx from 'xlsx'
import { AppError } from '../../../../shared/application/app.error.js'
import { detectSeasonFromFilename, SeasonDetectorError, matchesSeason } from '../../../../shared/utils/season-detector.util.js'

const prisma = new PrismaClient()

type ImportLecturerRow = Record<string, unknown>

const HEADER_ALIASES: Record<string, string[]> = {
    code: ['mã', 'ma', 'mã giảng viên', 'instructor code', 'lecturer code', 'mssv/gv'],
    fullName: ['họ và tên', 'ho va ten', 'full name', 'fullname', 'tên', 'name'],
    email: ['email', 'gmail'],
    subjects: ['môn dạy', 'mon day', 'subjects'],
    classes: ['lớp dạy', 'lop day', 'classes'],
    avatar: ['hình ảnh', 'hinh anh', 'avatar']
}

function getField(row: ImportLecturerRow, key: keyof typeof HEADER_ALIASES): string | undefined {
    const aliases = HEADER_ALIASES[key]
    for (const [header, value] of Object.entries(row)) {
        if (aliases.includes(header.trim().toLowerCase())) {
            const s = value?.toString().trim()
            if (s) return s
        }
    }
    return undefined
}

export class PreviewImportLecturersExcelUseCase {
    async execute(input: { fileBuffer: Buffer; fileName: string }) {
        const { fileBuffer, fileName } = input

        const normalizedName = fileName.toLowerCase()
        if (!normalizedName.includes('lecturer') && !normalizedName.includes('giảng viên') && !normalizedName.includes('giang_vien') && !normalizedName.includes('gv')) {
            throw new AppError('INVALID_FILE_NAME', 'Tên file không hợp lệ. Vui lòng đặt tên file có chứa từ khoá "lecturer" hoặc "giảng viên" (ví dụ: Lecturer_Spring2026.xlsx)', 400)
        }

        // BẮT BUỘC THEO THỨ TỰ: Học sinh -> Giảng viên -> Phân công
        const studentCount = await prisma.userRole.count({
            where: { Role: { RoleName: 'STUDENT' } }
        })
        if (studentCount === 0) {
            throw new AppError('STUDENT_IMPORT_REQUIRED', 'Vui lòng import danh sách Học sinh (Sinh viên) vào hệ thống trước khi import danh sách Giảng viên.', 400)
        }

        // 1. SEASON DETECTION: Extract and validate season from filename
        let detectedSeasonInfo
        try {
            detectedSeasonInfo = detectSeasonFromFilename(fileName)
        } catch (err: any) {
            const errorMsg = err instanceof SeasonDetectorError
                ? err.message
                : 'Không thể xác định mùa học từ tên file'
            throw new AppError('INVALID_SEASON', errorMsg, 400)
        }

        // 2. VALIDATE SEASON EXISTS (Lecturers must be mapped to an existing season or we just show preview with a warning)
        // Similar to students, we should check if it exists, or just let it pass if it auto-creates during real import.
        // The student logic auto-creates season during real import if not found, but preview throws SEASON_NOT_FOUND?
        // Wait, student preview throws SEASON_NOT_FOUND. Let's keep it consistent.
        const allSemesters = await prisma.semester.findMany()
        const targetSemesters = allSemesters.filter(
            s => matchesSeason(s.Season, detectedSeasonInfo)
        )

        // For lecturers, we can also auto-create season during import, so in preview, we don't necessarily need to block it. 
        // But to be consistent with student preview, we will block it if it doesn't exist.
        if (targetSemesters.length === 0) {
            const errorMsg = `Mùa '${detectedSeasonInfo.formatted}' được phát hiện từ tên file không tồn tại trong hệ thống. Vui lòng tạo kỳ học cho mùa này trước khi import, hoặc đổi tên file sang đúng mùa học hiện có (ví dụ: Spring2026_lecturers.xlsx).`
            throw new AppError('SEASON_NOT_FOUND', errorMsg, 404)
        }

        const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
            throw new AppError('INVALID_FILE', 'File Excel không có dữ liệu', 400)
        }

        const sheet = workbook.Sheets[sheetName]
        const rows: ImportLecturerRow[] = xlsx.utils.sheet_to_json(sheet)

        if (rows.length === 0) {
            throw new AppError('INVALID_FILE', 'File Excel rỗng', 400)
        }

        const previewRows = []
        let hasErrors = false

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowIndex = i + 2

            const code = getField(row, 'code')
            const fullName = getField(row, 'fullName')
            const email = getField(row, 'email')
            const subjectsStr = getField(row, 'subjects') || ''
            const classesStr = getField(row, 'classes') || ''

            const errors: string[] = []

            if (!code) errors.push('Thiếu mã giảng viên')
            if (!fullName) errors.push('Thiếu họ và tên')
            if (!email) errors.push('Thiếu email')
            if (!subjectsStr) errors.push('Thiếu môn dạy')
            if (!classesStr) errors.push('Thiếu lớp dạy')

            // Validate matching pairs
            const subjects = subjectsStr.split(/[,;]|\s+và\s+|\n|\s+/).map(s => s.trim()).filter(Boolean)
            const classes = classesStr.split(/[,;]|\s+và\s+|\n|\s+/).map(s => s.trim()).filter(Boolean)

            if (subjects.length > 0 && classes.length === 0) {
                 errors.push('Có môn dạy nhưng không có lớp dạy nào')
            }

            if (errors.length > 0) hasErrors = true

            previewRows.push({
                index: rowIndex,
                code: code || '',
                fullName: fullName || '',
                email: email || '',
                subjects: subjects.join(', ') || '',
                classes: classes.join(', ') || '',
                isValid: errors.length === 0,
                errors: errors
            })
        }

        return {
            detectedSeason: detectedSeasonInfo.formatted,
            totalRows: previewRows.length,
            hasErrors,
            rows: previewRows
        }
    }
}
