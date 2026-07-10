import { PrismaClient } from '@prisma/client'
import * as xlsx from 'xlsx'
import { AppError } from '../../../../shared/application/app.error.js'
import { detectSeasonFromFilename, SeasonDetectorError, matchesSeason } from '../../../../shared/utils/season-detector.util.js'

const prisma = new PrismaClient()

interface ImportStudentRow {
    MSSV?: string;
    'Họ và tên'?: string;
    Email?: string;
    'Số điện thoại'?: string;
    'Kỳ học'?: string;
    'Mùa'?: string;
    'Lớp học'?: string;
    'Mật khẩu tạm thời'?: string;
}

export class PreviewImportStudentsExcelUseCase {
    async execute(input: { fileBuffer: Buffer; fileName: string }) {
        const { fileBuffer, fileName } = input

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

        // 2. VALIDATE SEASON EXISTS.
        // Uses matchesSeason() which handles all DB storage formats:
        // 'Fall', 'Fall2026', 'Fall 2026', 'fall-2026', '2026Fall', etc.
        const allSemesters = await prisma.semester.findMany()
        const targetSemesters = allSemesters.filter(
            s => matchesSeason(s.Season, detectedSeasonInfo)
        )

        if (targetSemesters.length === 0) {
            const errorMsg = `Mùa '${detectedSeasonInfo.formatted}' được phát hiện từ tên file không tồn tại trong hệ thống. Vui lòng tạo kỳ học cho mùa này trước khi import, hoặc đổi tên file sang đúng mùa học hiện có (ví dụ: Spring2026_students.xlsx).`
            throw new AppError('SEASON_NOT_FOUND', errorMsg, 404)
        }

        const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
            throw new AppError('INVALID_FILE', 'File Excel không có dữ liệu', 400)
        }

        const sheet = workbook.Sheets[sheetName]
        const rows: ImportStudentRow[] = xlsx.utils.sheet_to_json(sheet)

        if (rows.length === 0) {
            throw new AppError('INVALID_FILE', 'File Excel rỗng', 400)
        }

        const previewRows = []
        let hasErrors = false

        // Re-use the already-fetched semesters (case-insensitive filtered above)
        // to prevent cross-season fuzzy match without an extra DB round-trip.
        const semesters = targetSemesters

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowIndex = i + 2

            const mssv = row['MSSV']?.toString().trim()
            const fullName = row['Họ và tên']?.toString().trim()
            const email = row['Email']?.toString().trim()
            const phone = row['Số điện thoại']?.toString().trim()
            const semesterCode = (row['Kỳ học'] || row['Mùa'])?.toString().trim()
            const classCode = row['Lớp học']?.toString().trim()
            const password = row['Mật khẩu tạm thời']?.toString().trim() || ''

            const errors: string[] = []

            if (!mssv) errors.push('Thiếu MSSV')
            if (!fullName) errors.push('Thiếu Họ và tên')
            if (!email) errors.push('Thiếu Email')
            if (!semesterCode) errors.push('Thiếu Kỳ học')
            if (!classCode) errors.push('Thiếu Lớp học')

            let resolvedSemesterCode = semesterCode
            // Validate semester exists within the detected season only
            if (semesterCode) {
                const semesterNumberMatch = semesterCode.match(/\d+/)
                const semesterNumber = semesterNumberMatch ? parseInt(semesterNumberMatch[0], 10) : null

                const existingSemester = semesters.find(s => {
                    if (s.Code === semesterCode) return true
                    if (s.Code?.toLowerCase() === semesterCode.toLowerCase()) return true
                    const sNumMatch = s.Code?.match(/\d+/)
                    const sNum = sNumMatch ? parseInt(sNumMatch[0], 10) : null
                    return sNum !== null && sNum === semesterNumber
                })

                if (existingSemester && existingSemester.Code) {
                    resolvedSemesterCode = existingSemester.Code
                } else {
                    errors.push(`Kỳ học "${semesterCode}" không tồn tại trong mùa ${detectedSeasonInfo.formatted}`)
                }
            }

            if (errors.length > 0) hasErrors = true

            previewRows.push({
                index: rowIndex,
                mssv: mssv || '',
                fullName: fullName || '',
                email: email || '',
                phone: phone || '',
                semester: resolvedSemesterCode || '',
                className: classCode || '',
                password: password,
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
