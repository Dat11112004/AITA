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
    outOfSemesterSubjects: ['môn khác kỳ hiện tại (nợ/học vượt)', 'mon khac ky hien tai', 'out of semester subjects', 'nợ/học vượt', 'khác kỳ'],
    passedSubjects: ['môn đã học vượt thành công', 'mon da hoc vuot thanh cong', 'passed subjects', 'học vượt thành công', 'đã học'],
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
    constructor(private readonly emailService: IEmailService) { }

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

            const studentRole = await prisma.role.findUnique({ where: { RoleName: 'STUDENT' } })
            if (!studentRole) {
                throw new AppError('SYSTEM_ERROR', 'Chưa cấu hình role STUDENT trong hệ thống', 500)
            }

            // Tracking for sync
            const processedClasses: Array<{ semesterCode?: string; classCode: string; subjectCode?: string; userId: string }> = []

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
                    const outOfSemesterStr = getField(row, 'outOfSemesterSubjects') || ''
                    const passedStr = getField(row, 'passedSubjects') || ''

                    if (!mssv || !fullName || !email || !semesterCode || !classCode) {
                        throw new Error('Thiếu thông tin bắt buộc (MSSV, Họ và tên, Email, Kỳ học, Lớp học)')
                    }

                    // 1. Check duplicate MSSV or Email
                    let user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { Email: email },
                                { StudentCode: mssv }
                            ]
                        }
                    })

                    let rawPassword = ''
                    let passwordHash = ''

                    if (!user) {
                        rawPassword = crypto.randomBytes(4).toString('hex')
                        passwordHash = await bcrypt.hash(rawPassword, 10)
                        user = await prisma.user.create({
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
                                }
                            }
                        })
                    }

                    // Store pending enrollments
                    const pendingEnrollments: any[] = []

                    // Main class
                    pendingEnrollments.push({
                        UserId: user.Id,
                        SemesterCode: semesterCode,
                        ClassCode: classCode,
                        SubjectCode: null,
                    })

                    // Extra classes
                    const extraClassesStrs = [
                        ...outOfSemesterStr.split(',').map(s => s.trim()).filter(Boolean),
                        ...passedStr.split(',').map(s => s.trim()).filter(Boolean)
                    ]

                    for (const extraStr of extraClassesStrs) {
                        const parts = extraStr.split('-')
                        if (parts.length >= 2) {
                            const subjectCode = parts[0].trim()
                            const clsCode = parts.slice(1).join('-').trim()
                            pendingEnrollments.push({
                                UserId: user.Id,
                                SemesterCode: null,
                                ClassCode: clsCode,
                                SubjectCode: subjectCode,
                            })
                        }
                    }

                    // Tracking for sync
                    if (semesterCode && classCode) {
                        processedClasses.push({
                            semesterCode: semesterCode,
                            classCode: classCode,
                            userId: user.Id
                        })
                    }

                    for (const extraStr of extraClassesStrs) {
                        const parts = extraStr.split('-')
                        if (parts.length >= 2) {
                            const subjectCode = parts[0].trim()
                            const clsCode = parts.slice(1).join('-').trim()
                            processedClasses.push({
                                subjectCode: subjectCode,
                                classCode: clsCode,
                                userId: user.Id
                            })
                        }
                    }

                    // Create pending enrollments in DB (avoid exact duplicates)
                    for (const pe of pendingEnrollments) {
                        const existingPe = await (prisma as any).pendingEnrollment.findFirst({
                            where: {
                                UserId: pe.UserId,
                                SemesterCode: pe.SemesterCode,
                                ClassCode: pe.ClassCode,
                                SubjectCode: pe.SubjectCode
                            }
                        })
                        if (!existingPe) {
                            await (prisma as any).pendingEnrollment.create({
                                data: pe
                            })
                        }
                    }

                    // Try to enroll immediately if classes exist
                    const classesToEnroll: string[] = []
                    
                    // Main classes check
                    const semester = await prisma.semester.findFirst({ where: { Code: semesterCode } })
                    if (semester) {
                        const classes = await prisma.class.findMany({
                            where: { SemesterId: semester.Id, ClassCode: classCode },
                            include: { Subject: true }
                        })
                        classesToEnroll.push(...classes.map(c => c.Id))
                    }

                    // Extra classes check
                    for (const pe of pendingEnrollments) {
                        if (pe.SubjectCode && pe.ClassCode) {
                            const cls = await prisma.class.findFirst({
                                where: { ClassCode: pe.ClassCode, Subject: { SubjectCode: pe.SubjectCode } }
                            })
                            if (cls) classesToEnroll.push(cls.Id)
                        }
                    }

                    // Enroll user to classes and update pending enrollment status
                    const uniqueClassesToEnroll = [...new Set(classesToEnroll)]
                    const subjectsList: string[] = []
                    const enrolledClassDetails: string[] = []

                    for (const classId of uniqueClassesToEnroll) {
                        const cls = await prisma.class.findUnique({
                            where: { Id: classId },
                            include: { 
                                Subject: true, 
                                Semester: true,
                                InstructorClass: {
                                    include: { User: true }
                                }
                            }
                        })
                        if (cls) {
                            const existingEnrollment = await prisma.studentClass.findUnique({
                                where: { UserId_ClassId: { UserId: user.Id, ClassId: classId } }
                            })
                            if (!existingEnrollment) {
                                await prisma.studentClass.create({
                                    data: { UserId: user.Id, ClassId: classId, EnrolledAt: new Date() }
                                })
                            }
                            if (cls.Subject) {
                                subjectsList.push(cls.Subject.SubjectCode as string)
                            }

                            // Extract instructors
                            let instructorStr = 'Đang cập nhật'
                            if (cls.InstructorClass && cls.InstructorClass.length > 0) {
                                instructorStr = cls.InstructorClass.map(ic => `${ic.User.FullName} (${ic.User.Email})`).join(', ')
                            }

                            const subjectStr = cls.Subject ? `${cls.Subject.SubjectCode}` : 'Chưa rõ môn'
                            enrolledClassDetails.push(`<li><strong>Môn ${subjectStr} (Lớp: ${cls.ClassCode || classCode}):</strong> Giảng viên: ${instructorStr}</li>`)

                            // Mark related pending enrollments as Enrolled
                            const peQuery: any = {
                                UserId: user.Id,
                                ClassCode: cls.ClassCode,
                            }
                            if (cls.Semester?.Code) {
                                peQuery.SemesterCode = cls.Semester.Code
                            }
                            await (prisma as any).pendingEnrollment.updateMany({
                                where: peQuery,
                                data: { Status: 'Enrolled' }
                            })
                            
                            const peQuery2: any = {
                                UserId: user.Id,
                                ClassCode: cls.ClassCode,
                            }
                            if (cls.Subject?.SubjectCode) {
                                peQuery2.SubjectCode = cls.Subject.SubjectCode
                            }
                            await (prisma as any).pendingEnrollment.updateMany({
                                where: peQuery2,
                                data: { Status: 'Enrolled' }
                            })
                        }
                    }

                    // 6. Send Email Notifications
                    
                    // 6.1. Send Account Creation Email if new user
                    if (rawPassword) {
                        await this.emailService.sendEmail(
                            email,
                            'Thông tin tài khoản hệ thống AITA',
                            `
                                <p>Chào <strong>${fullName}</strong>,</p>
                                <p>Tài khoản của bạn đã được tạo thành công trên hệ thống AITA.</p>
                                <ul>
                                    <li><strong>MSSV:</strong> ${mssv}</li>
                                    <li><strong>Email đăng nhập:</strong> ${email}</li>
                                    <li><strong>Mật khẩu tạm:</strong> ${rawPassword}</li>
                                </ul>
                                <p><strong>Lưu ý:</strong> đây là mật khẩu tạm. Khi đăng nhập lần đầu trên website, hệ thống sẽ yêu cầu bạn đổi mật khẩu mới để bảo mật tài khoản.</p>
                            `
                        )
                    }

                    // 6.2. Send Class Enrollment Email
                    const classEnrollmentContent = `
                        <p>Chào <strong>${fullName}</strong>,</p>
                        <p>Bạn vừa được phân bổ vào danh sách lớp học trên hệ thống AITA.</p>
                        <ul>
                            <li><strong>Kỳ học:</strong> ${semesterCode}</li>
                            <li><strong>Lớp định danh:</strong> ${classCode}</li>
                        </ul>
                        <p><strong>Chi tiết các môn đã xếp lớp:</strong></p>
                        <ul>
                            ${enrolledClassDetails.length > 0 ? enrolledClassDetails.join('\n') : '<li>Đang chờ giảng viên tạo lớp, vui lòng theo dõi thêm.</li>'}
                        </ul>
                        <p>Vui lòng đăng nhập vào hệ thống (Email: <strong>${email}</strong>) để theo dõi và nộp bài tập.</p>
                    `
                    await this.emailService.sendEmail(
                        email,
                        'Thông báo lớp học hệ thống AITA',
                        classEnrollmentContent
                    )

                    successCount++
                } catch (err: any) {
                    errorCount++
                    errors.push(`Dòng ${rowIndex} (${getField(row, 'email') || 'Không rõ'}): ${err.message}`)
                }
            }

            // --- SYNC DELETION LOGIC ---
            try {
                const classRosters = new Map<string, Set<string>>()
                
                for (const pc of processedClasses) {
                    let clsId: string | null = null
                    if (pc.semesterCode && pc.classCode) {
                        const semester = await prisma.semester.findFirst({ where: { Code: pc.semesterCode } })
                        if (semester) {
                            const cls = await prisma.class.findFirst({ where: { SemesterId: semester.Id, ClassCode: pc.classCode } })
                            if (cls) clsId = cls.Id
                        }
                    } else if (pc.subjectCode && pc.classCode) {
                        const cls = await prisma.class.findFirst({
                            where: { ClassCode: pc.classCode, Subject: { SubjectCode: pc.subjectCode } }
                        })
                        if (cls) clsId = cls.Id
                    }

                    if (clsId) {
                        if (!classRosters.has(clsId)) {
                            classRosters.set(clsId, new Set())
                        }
                        classRosters.get(clsId)!.add(pc.userId)
                    }
                }

                for (const [classId, validUserIds] of classRosters.entries()) {
                    const currentStudents = await prisma.studentClass.findMany({
                        where: { ClassId: classId },
                        select: { UserId: true }
                    })

                    const studentsToRemove = currentStudents
                        .filter(cs => !validUserIds.has(cs.UserId))
                        .map(cs => cs.UserId)

                    if (studentsToRemove.length > 0) {
                        await prisma.studentClass.deleteMany({
                            where: { ClassId: classId, UserId: { in: studentsToRemove } }
                        })
                        
                        const cls = await prisma.class.findUnique({
                            where: { Id: classId },
                            include: { Semester: true, Subject: true }
                        })
                        if (cls) {
                            const orConditions: any[] = []
                            if (cls.Semester?.Code) orConditions.push({ SemesterCode: cls.Semester.Code })
                            if (cls.Subject?.SubjectCode) orConditions.push({ SubjectCode: cls.Subject.SubjectCode })
                            
                            await (prisma as any).pendingEnrollment.updateMany({
                                where: {
                                    UserId: { in: studentsToRemove },
                                    ClassCode: cls.ClassCode,
                                    OR: orConditions.length > 0 ? orConditions : undefined
                                },
                                data: { Status: 'Cancelled' }
                            })
                        }
                    }
                }
            } catch (syncErr) {
                console.error('Failed to sync deletions:', syncErr)
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
