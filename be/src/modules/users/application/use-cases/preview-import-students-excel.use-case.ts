import { PrismaClient } from '@prisma/client'
import * as xlsx from 'xlsx'
import { AppError } from '../../../../shared/application/app.error.js'

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
    async execute(input: { fileBuffer: Buffer }) {
        const { fileBuffer } = input
        
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

        // Fetch all semesters beforehand to avoid N+1 querying in preview
        const semesters = await prisma.semester.findMany()

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
            // Validate semester exists
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
            totalRows: previewRows.length,
            hasErrors,
            rows: previewRows
        }
    }
}
