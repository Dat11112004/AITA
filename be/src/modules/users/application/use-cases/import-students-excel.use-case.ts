import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as xlsx from 'xlsx'
import crypto from 'crypto'
import { IEmailService } from '../../../../shared/application/email.service.interface.js'
import { AppError } from '../../../../shared/application/app.error.js'

const prisma = new PrismaClient()

type ImportStudentRow = Record<string, unknown>

// Chấp nhận cả header tiếng Việt lẫn tiếng Anh (file của Admin có thể xuất từ template khác nhau).
// So khớp không phân biệt hoa thường và bỏ khoảng trắng thừa.
const HEADER_ALIASES: Record<string, string[]> = {
    mssv: ['mssv', 'student id', 'studentid', 'student code'],
    fullName: ['họ và tên', 'ho va ten', 'full name', 'fullname'],
    email: ['email'],
    phone: ['số điện thoại', 'so dien thoai', 'phone number', 'phone'],
    semester: ['kỳ học', 'ky hoc', 'semester'],
    classCode: ['lớp học', 'lop hoc', 'class'],
}

function getField(row: ImportStudentRow, key: keyof typeof HEADER_ALIASES): string | undefined {
    const aliases = HEADER_ALIASES[key]
    for (const [header, value] of Object.entries(row)) {
        if (aliases.includes(header.trim().toLowerCase())) {
            const s = value?.toString().trim()
            if (s) return s
        }
    }
    return undefined
}

export class ImportStudentsExcelUseCase {
    constructor(private readonly emailService: IEmailService) {}

    async execute(input: { fileBuffer: Buffer; fileName: string; fileUrl: string; importedByUserId: string }) {
        const { fileBuffer, fileName, fileUrl, importedByUserId } = input
        
        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        // 1. Create ImportBatch record first
        const batch = await prisma.importBatch.create({
            data: {
                FileName: fileName,
                FileUrl: fileUrl,
                Status: 'PROCESSING',
                TotalRows: 0,
                SuccessCount: 0,
                ErrorCount: 0,
                ImportedBy: importedByUserId
            }
        })

        try {
            // 2. Parse Excel file
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
            const sheetName = workbook.SheetNames[0]
            if (!sheetName) {
                throw new AppError('INVALID_FILE', 'File Excel không có dữ liệu', 400)
            }

            const sheet = workbook.Sheets[sheetName]
            const rows: ImportStudentRow[] = xlsx.utils.sheet_to_json(sheet)
            
            await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: { TotalRows: rows.length }
            })

            // Roles trong DB là UPPERCASE (xem seed/auth) — 'student' thường sẽ không bao giờ khớp
            const studentRole = await prisma.role.findUnique({ where: { RoleName: 'STUDENT' } })
            if (!studentRole) {
                throw new AppError('SYSTEM_ERROR', 'Chưa cấu hình role STUDENT trong hệ thống', 500)
            }

            // Process row by row
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]
                const rowIndex = i + 2 // +2 because 0-index and header row

                try {
                    const mssv = getField(row, 'mssv')
                    const fullName = getField(row, 'fullName')
                    const email = getField(row, 'email')
                    const phone = getField(row, 'phone')
                    const semesterCode = getField(row, 'semester')
                    const classCode = getField(row, 'classCode')

                    if (!mssv || !fullName || !email || !semesterCode || !classCode) {
                        throw new Error('Thiếu thông tin bắt buộc (MSSV, Họ và tên, Email, Kỳ học, Lớp học)')
                    }

                    // 1. Check duplicate MSSV or Email
                    const existingUser = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { Email: email },
                                { StudentCode: mssv }
                            ]
                        }
                    })

                    if (existingUser) {
                        throw new Error(`Email hoặc MSSV đã tồn tại trong hệ thống`)
                    }

                    // 2. Check Semester
                    const semester = await prisma.semester.findFirst({
                        where: { Code: semesterCode }
                    })

                    if (!semester) {
                        throw new Error(`Không tìm thấy Kỳ học "${semesterCode}" trong hệ thống`)
                    }

                    // 3. Find Classes
                    const classes = await prisma.class.findMany({
                        where: {
                            SemesterId: semester.Id,
                            ClassCode: classCode
                        },
                        include: {
                            Subject: true
                        }
                    })

                    if (classes.length === 0) {
                        throw new Error(`Không tìm thấy Lớp học "${classCode}" thuộc Kỳ học "${semesterCode}"`)
                    }

                    // 4. Create User
                    const rawPassword = crypto.randomBytes(4).toString('hex') // 8 chars
                    const passwordHash = await bcrypt.hash(rawPassword, 10)

                    // Note: Since we want LastLoginAt to be null for FirstLogin=true, it will be null by default
                    await prisma.user.create({
                        data: {
                            StudentCode: mssv,
                            FullName: fullName,
                            Email: email,
                            Phone: phone,
                            PasswordHash: passwordHash,
                            Status: 'Active',
                            RequirePasswordChange: true,
                            UserRole: {
                                create: {
                                    RoleId: studentRole.Id,
                                    AssignedAt: new Date()
                                }
                            },
                            // Add student to all matching classes (subjects)
                            StudentClass: {
                                create: classes.map(cls => ({
                                    ClassId: cls.Id,
                                    EnrolledAt: new Date()
                                }))
                            }
                        }
                    })

                    // 5. Send Email
                    const subjectsList = classes.map(c => c.Subject?.SubjectCode).filter(Boolean).join(', ')
                    
                    await this.emailService.sendEmail(
                        email,
                        'Thông tin tài khoản sinh viên AITA',
                        `
                            <p>Chào <strong>${fullName}</strong>,</p>
                            <p>Tài khoản của bạn trên hệ thống AITA đã được tạo thành công.</p>
                            <ul>
                                <li><strong>MSSV:</strong> ${mssv}</li>
                                <li><strong>Email đăng nhập:</strong> ${email}</li>
                                <li><strong>Mật khẩu tạm:</strong> ${rawPassword}</li>
                                <li><strong>Kỳ học hiện tại:</strong> Semester ${semesterCode}</li>
                                <li><strong>Lớp học:</strong> ${classCode}</li>
                                <li><strong>Các môn tham gia:</strong> ${subjectsList || 'Không có'}</li>
                            </ul>
                            <p><strong>Lưu ý:</strong> đây là mật khẩu tạm. Khi đăng nhập lần đầu trên website, hệ thống sẽ yêu cầu bạn đổi mật khẩu mới trước khi vào lớp học và nộp bài.</p>
                        `
                    )

                    successCount++
                } catch (err: any) {
                    errorCount++
                    errors.push(`Dòng ${rowIndex} (${getField(row, 'email') || 'Không rõ'}): ${err.message}`)
                }
            }

            // Update batch final status
            const finalBatch = await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: {
                    Status: 'COMPLETED',
                    SuccessCount: successCount,
                    ErrorCount: errorCount,
                    ErrorDetails: JSON.stringify(errors)
                }
            })

            return {
                batchId: finalBatch.Id,
                totalProcessed: rows.length,
                successCount,
                errorCount,
                errors
            }

        } catch (err: any) {
            await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: {
                    Status: 'FAILED',
                    ErrorDetails: err.message
                }
            })
            throw err
        }
    }
}
