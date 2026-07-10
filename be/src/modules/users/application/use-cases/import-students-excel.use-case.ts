import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as xlsx from 'xlsx'
import crypto from 'crypto'
import { CloudinaryService } from '../../../../shared/infrastructure/services/cloudinary.service.js'
import { detectSeasonFromFilename, SeasonDetectorError, matchesSeason } from '../../../../shared/utils/season-detector.util.js'

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
    semester: ['kỳ học', 'kì học', 'ky hoc', 'ki hoc', 'semester'],
    classCode: ['lớp học', 'lop hoc', 'class'],
    outOfSemesterSubjects: ['môn khác kỳ hiện tại (nợ/học vượt)', 'môn khác kì hiện tại (nợ/học vượt)', 'mon khac ky hien tai', 'out of semester subjects', 'nợ/học vượt', 'khác kỳ', 'khác kì'],
    passedSubjects: ['môn đã học vượt thành công', 'mon da hoc vuot thanh cong', 'passed subjects', 'học vượt thành công', 'đã học'],
    // Cột nợ môn — dùng riêng biệt, lookup KHÔNG bị giới hạn theo mùa hiện tại
    retakeSubjects: ['nợ môn', 'no mon', 'môn nợ', 'mon no', 'retake subjects', 'retake', 'subject debt', 'nợ', 'debt subjects', 'môn học nợ', 'mon hoc no'],
    avatar: ['avatar', 'ảnh đại diện', 'anh dai dien', 'hình ảnh', 'hinh anh', 'ảnh', 'anh'],
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

        // 1. SEASON DETECTION: Extract season from filename before any processing
        let detectedSeasonInfo
        try {
            detectedSeasonInfo = detectSeasonFromFilename(fileName)
        } catch (err: any) {
            const errorMsg = err instanceof SeasonDetectorError
                ? err.message
                : 'Không thể xác định mùa học từ tên file'
            throw new AppError('INVALID_SEASON', errorMsg, 400)
        }

        // 2. FIND TARGET SEMESTER: Get semesters for detected season.
        // Uses matchesSeason() which handles all DB storage formats:
        // 'Fall', 'Fall2026', 'Fall 2026', 'fall-2026', '2026Fall', etc.
        const allSemesters = await prisma.semester.findMany()
        const targetSemesters = allSemesters.filter(
            s => matchesSeason(s.Season, detectedSeasonInfo)
        )

        if (targetSemesters.length === 0) {
            // ── AUTO-CREATE SEASON ──────────────────────────────────────────────
            // Season is not in the system yet. Create it automatically with 9
            // semesters (Kỳ 1 → Kỳ 9) and auto-link the default subjects based on
            // each subject's `Semester` attribute (same logic as SemesterRepository.createSeason).
            console.log(`[Import] Season '${detectedSeasonInfo.formatted}' not found. Auto-creating season + semesters + subjects...`)
            const { randomUUID } = await import('crypto')
            const seasonLabel = detectedSeasonInfo.formatted  // e.g. "Spring 2026"

            await prisma.$transaction(async (tx: any) => {
                for (let i = 1; i <= 9; i++) {
                    const semId = randomUUID()
                    const code = `Kỳ ${i}`

                    await tx.semester.create({
                        data: {
                            Id: semId,
                            Code: code,
                            Season: seasonLabel,
                            IsActive: true,
                            StartDate: null,
                            EndDate: null
                        }
                    })

                    // Auto-link subjects whose Semester == i
                    const matchingSubjects = await tx.subject.findMany({
                        where: { Semester: i },
                        select: { Id: true }
                    })
                    if (matchingSubjects.length > 0) {
                        await tx.semesterSubject.createMany({
                            data: matchingSubjects.map((s: any) => ({ SemesterId: semId, SubjectId: s.Id }))
                        })
                    }

                    targetSemesters.push({ Id: semId, Code: code, Season: seasonLabel, IsActive: true, StartDate: null, EndDate: null } as any)
                }
            })
            console.log(`[Import] Auto-created season '${seasonLabel}' with 9 semesters successfully.`)
        }

        // 3. Create ImportBatch record
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
            // 4. Parse Excel file
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
            const processedClasses: Array<{ semesterCode?: string; classCode: string; subjectCode?: string; userId: string; isRetake?: boolean }> = []

            // Process row by row
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]
                const rowIndex = i + 2 // +2 because 0-index and header row

                try {
                    const mssv = getField(row, 'mssv')
                    const fullName = getField(row, 'fullName')
                    const email = getField(row, 'email')
                    const phone = getField(row, 'phone')
                    let semesterCode = getField(row, 'semester')
                    const classCode = getField(row, 'classCode')
                    const outOfSemesterStr = getField(row, 'outOfSemesterSubjects') || ''
                    const passedStr = getField(row, 'passedSubjects') || ''
                    // Cột nợ môn riêng: lookup không giới hạn mùa
                    const retakeStr = getField(row, 'retakeSubjects') || ''
                    const avatarUrlRaw = getField(row, 'avatar') || ''

                    if (!mssv || !fullName || !email || !semesterCode || !classCode) {
                        throw new Error('Thiếu thông tin bắt buộc (MSSV, Họ và tên, Email, Kỳ học, Lớp học)')
                    }

                    // Fuzzy-match semesterCode against ONLY the target season's semesters
                    // This prevents "Kỳ 1" from matching a semester in a different season
                    const semesterNumberMatch = semesterCode.match(/\d+/)
                    const semesterNumber = semesterNumberMatch ? parseInt(semesterNumberMatch[0], 10) : null

                    const existingSemester = targetSemesters.find(s => {
                        if (s.Code === semesterCode) return true
                        if (s.Code?.toLowerCase() === semesterCode!.toLowerCase()) return true
                        const sNumMatch = s.Code?.match(/\d+/)
                        const sNum = sNumMatch ? parseInt(sNumMatch[0], 10) : null
                        return sNum !== null && sNum === semesterNumber
                    })

                    if (existingSemester && existingSemester.Code) {
                        semesterCode = existingSemester.Code
                    } else if (semesterNumberMatch) {
                        semesterCode = `Kỳ ${semesterNumberMatch[0]}`
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

                    // Xử lý upload avatar (nếu có URL hợp lệ)
                    let secureAvatarUrl: string | null = null;
                    if (avatarUrlRaw && avatarUrlRaw.startsWith('http')) {
                        try {
                            secureAvatarUrl = await CloudinaryService.uploadImageFromUrl(avatarUrlRaw);
                        } catch (err) {
                            console.warn(`Lỗi upload avatar cho ${email}:`, err);
                        }
                    }

                    if (!user) {
                        rawPassword = crypto.randomBytes(4).toString('hex')
                        passwordHash = await bcrypt.hash(rawPassword, 10)
                        user = await prisma.user.create({
                            data: {
                                StudentCode: mssv,
                                FullName: fullName,
                                Email: email,
                                Phone: phone,
                                Avatar: secureAvatarUrl,
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
                    } else if (secureAvatarUrl) {
                        // Nếu user đã tồn tại nhưng trong Excel có truyền avatar URL mới, ta update avatar cho họ
                        user = await prisma.user.update({
                            where: { Id: user.Id },
                            data: { Avatar: secureAvatarUrl }
                        });
                    }

                    // Store pending enrollments
                    const pendingEnrollments: any[] = []

                    // Main class
                    pendingEnrollments.push({
                        UserId: user.Id,
                        SemesterCode: semesterCode,
                        Season: detectedSeasonInfo.formatted,
                        ClassCode: classCode,
                        SubjectCode: null,
                    })

                    // Extra classes (học vượt / ngoài kỳ) — format: SubjectCode-ClassCode
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
                                Season: detectedSeasonInfo.formatted,
                                ClassCode: clsCode,
                                SubjectCode: subjectCode,
                            })
                        }
                    }

                    // Nợ môn — hỗ trợ 2 format:
                    //   1. SubjectCode-ClassCode  (vd: PRO232-SE17C01)
                    //   2. SubjectCode only       (vd: PRO232) → tự tìm class phù hợp
                    const retakeStrs = retakeStr.split(',').map((s: string) => s.trim()).filter(Boolean)
                    for (const retakeEntry of retakeStrs) {
                        const parts = retakeEntry.split('-')
                        const subjectCode = parts[0].trim()
                        const clsCode = parts.length >= 2 ? parts.slice(1).join('-').trim() : null
                        pendingEnrollments.push({
                            UserId: user.Id,
                            SemesterCode: null,
                            Season: detectedSeasonInfo.formatted,
                            // ClassCode null = auto-find dựa trên Subject.Semester
                            ClassCode: clsCode ?? '__RETAKE_AUTO__',
                            SubjectCode: subjectCode,
                            // Đánh dấu là retake để lookup không giới hạn mùa
                            IsRetake: true,
                            RetakeClassCode: clsCode,
                        })
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
                    // Track retake classes để sync deletion KHÔNG nhầm xóa
                    for (const retakeEntry of retakeStrs) {
                        const parts = retakeEntry.split('-')
                        const subjectCode = parts[0].trim()
                        const clsCode = parts.length >= 2 ? parts.slice(1).join('-').trim() : null
                        if (clsCode) {
                            processedClasses.push({
                                subjectCode,
                                classCode: clsCode,
                                userId: user.Id,
                                isRetake: true,
                            })
                        }
                    }

                    // Create pending enrollments in DB (avoid exact duplicates)
                    for (const pe of pendingEnrollments) {
                        const existingPe = await (prisma as any).pendingEnrollment.findFirst({
                            where: {
                                UserId: pe.UserId,
                                SemesterCode: pe.SemesterCode,
                                Season: pe.Season,
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

                    // Precompute IDs of semesters belonging ONLY to the detected season.
                    // This is the single source of truth used everywhere below to prevent
                    // cross-season enrollment (e.g. a Fall2026 import must never touch Spring2026 classes).
                    const targetSemesterIds = new Set(targetSemesters.map(s => s.Id))

                    // ── Main class lookup ────────────────────────────────────────────────
                    // Match semester by Code scoped to the detected season.
                    const semester = targetSemesters.find(s => s.Code === semesterCode) ?? null

                    if (semester) {
                        const expectedSubjects = await (prisma as any).semesterSubject.findMany({
                            where: { SemesterId: semester.Id },
                            select: { SubjectId: true }
                        });

                        const classes = await prisma.class.findMany({
                            where: {
                                SemesterId: semester.Id,
                                ClassCode: classCode
                            },
                            select: { Id: true, SubjectId: true }
                        })

                        const existingSubjectIds = new Set(classes.map(c => c.SubjectId))

                        // Auto-create missing classes
                        for (const es of expectedSubjects) {
                            if (!existingSubjectIds.has(es.SubjectId)) {
                                const newClass = await prisma.class.create({
                                    data: {
                                        ClassCode: classCode,
                                        SubjectId: es.SubjectId,
                                        SemesterId: semester.Id,
                                        Status: 'Active'
                                    }
                                })
                                classesToEnroll.push(newClass.Id)
                                existingSubjectIds.add(es.SubjectId)
                            }
                        }

                        classesToEnroll.push(...classes.map(c => c.Id))
                    }

                    // ── Extra classes lookup (học vượt / ngoài kỳ) ──────────────────────
                    // Vẫn giới hạn targetSemesterIds cho extraClasses bình thường
                    // vì chúng thuộc cùng mùa (cross-season prevention).
                    for (const pe of pendingEnrollments) {
                        // Bỏ qua các entry retake — sẽ xử lý riêng bên dưới
                        if ((pe as any).IsRetake) continue
                        if (!pe.SubjectCode || !pe.ClassCode) continue

                        let cls = await prisma.class.findFirst({
                            where: {
                                ClassCode: pe.ClassCode,
                                Subject: { SubjectCode: pe.SubjectCode },
                                SemesterId: { in: Array.from(targetSemesterIds) }
                            },
                            select: { Id: true }
                        })

                        if (!cls) {
                            const targetSubj = await prisma.subject.findUnique({
                                where: { SubjectCode: pe.SubjectCode }
                            })

                            if (targetSubj) {
                                const semSubj = await (prisma as any).semesterSubject.findFirst({
                                    where: {
                                        SubjectId: targetSubj.Id,
                                        SemesterId: { in: Array.from(targetSemesterIds) }
                                    }
                                })

                                if (semSubj) {
                                    cls = await prisma.class.create({
                                        data: {
                                            ClassCode: pe.ClassCode,
                                            SubjectId: targetSubj.Id,
                                            SemesterId: semSubj.SemesterId,
                                            Status: 'Active'
                                        }
                                    })
                                }
                            }
                        }

                        if (cls) classesToEnroll.push(cls.Id)
                    }

                    // ── Nợ môn lookup — KHÔNG giới hạn mùa ──────────────────────────────
                    // Môn nợ thuộc kỳ/mùa cũ hơn → phải tìm trên toàn bộ DB.
                    for (const pe of pendingEnrollments) {
                        if (!(pe as any).IsRetake || !pe.SubjectCode) continue

                        const retakeClassCode = (pe as any).RetakeClassCode as string | null

                        if (retakeClassCode) {
                            // Format 1: SubjectCode-ClassCode → tìm chính xác theo class code + subject
                            let cls = await prisma.class.findFirst({
                                where: {
                                    ClassCode: retakeClassCode,
                                    Subject: { SubjectCode: pe.SubjectCode },
                                },
                                select: { Id: true, SemesterId: true }
                            })

                            if (!cls) {
                                // Auto-create: tìm subject → tìm SemesterSubject bất kỳ (ưu tiên mùa hiện tại)
                                const retakeSubj = await prisma.subject.findUnique({
                                    where: { SubjectCode: pe.SubjectCode }
                                })

                                if (retakeSubj) {
                                    // Ưu tiên SemesterSubject trong mùa hiện tại, fallback sang mùa khác
                                    let semSubj = await (prisma as any).semesterSubject.findFirst({
                                        where: {
                                            SubjectId: retakeSubj.Id,
                                            SemesterId: { in: Array.from(targetSemesterIds) }
                                        }
                                    })
                                    if (!semSubj) {
                                        semSubj = await (prisma as any).semesterSubject.findFirst({
                                            where: { SubjectId: retakeSubj.Id },
                                            orderBy: { AssignedAt: 'desc' }
                                        })
                                    }

                                    if (semSubj) {
                                        cls = await prisma.class.create({
                                            data: {
                                                ClassCode: retakeClassCode,
                                                SubjectId: retakeSubj.Id,
                                                SemesterId: semSubj.SemesterId,
                                                Status: 'Active'
                                            }
                                        })
                                        console.log(`[Import][Retake] Auto-created class '${retakeClassCode}' cho môn nợ '${pe.SubjectCode}'`)
                                    } else {
                                        console.warn(`[Import][Retake] Không tìm thấy SemesterSubject cho môn '${pe.SubjectCode}' — bỏ qua`)
                                    }
                                }
                            }

                            if (cls) classesToEnroll.push(cls.Id)
                        } else {
                            // Format 2: Chỉ SubjectCode → tự tìm class theo Subject.Semester
                            const retakeSubj = await prisma.subject.findUnique({
                                where: { SubjectCode: pe.SubjectCode },
                                select: { Id: true, Semester: true }
                            })

                            if (retakeSubj) {
                                // Tìm class phù hợp nhất: cùng SubjectId, ưu tiên mùa có enrollments
                                const existingCls = await prisma.class.findFirst({
                                    where: {
                                        SubjectId: retakeSubj.Id,
                                        ClassCode: classCode,   // dùng class code chính
                                    },
                                    orderBy: { Id: 'desc' },
                                    select: { Id: true }
                                })

                                if (existingCls) {
                                    classesToEnroll.push(existingCls.Id)
                                    console.log(`[Import][Retake-Auto] Tìm thấy class cho môn '${pe.SubjectCode}': ${existingCls.Id}`)
                                } else {
                                    console.warn(`[Import][Retake-Auto] Không tìm thấy class cho môn '${pe.SubjectCode}' với classCode '${classCode}' — bỏ qua`)
                                }
                            }
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
                            if (cls.SubjectId && cls.SemesterId) {
                                // Remove duplicate enrollments for same subject+semester,
                                // but ONLY within the detected season's semesters.
                                // Never touch enrollments in other seasons (Spring, Winter, etc.)
                                if (targetSemesterIds.has(cls.SemesterId)) {
                                    const oldClasses = await prisma.studentClass.findMany({
                                        where: {
                                            UserId: user.Id,
                                            Class: {
                                                SubjectId: cls.SubjectId,
                                                SemesterId: cls.SemesterId,
                                                Id: { not: classId }
                                            }
                                        }
                                    });
                                    for (const old of oldClasses) {
                                        await prisma.studentClass.delete({
                                            where: { UserId_ClassId: { UserId: user.Id, ClassId: old.ClassId } }
                                        });
                                        await prisma.submission.updateMany({
                                            where: { StudentId: user.Id, ClassId: old.ClassId },
                                            data: { ClassId: classId }
                                        });
                                    }
                                }
                            }

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
            // Only touches classes that belong to the detected season (targetSemesterIds).
            // Classes from other seasons (e.g. Spring) are never modified.
            try {
                const classRosters = new Map<string, Set<string>>()
                const targetSemesterIds = new Set(targetSemesters.map(s => s.Id))

                for (const pc of processedClasses) {
                    let clsId: string | null = null
                    if (pc.semesterCode && pc.classCode) {
                        // Scope semester lookup to the detected season
                        const semester = targetSemesters.find(s => s.Code === pc.semesterCode) ?? null
                        if (semester) {
                            const cls = await prisma.class.findFirst({
                                where: { SemesterId: semester.Id, ClassCode: pc.classCode }
                            })
                            if (cls) clsId = cls.Id
                        }
                    } else if (pc.subjectCode && pc.classCode) {
                        // Retake classes KHÔNG giới hạn mùa — tìm toàn DB theo SubjectCode + ClassCode
                        // Extra classes bình thường vẫn tìm trong targetSemesterIds
                        const isRetakeEntry = (pc as any).isRetake === true
                        const cls = await prisma.class.findFirst({
                            where: {
                                ClassCode: pc.classCode,
                                Subject: { SubjectCode: pc.subjectCode },
                                ...(!isRetakeEntry && { SemesterId: { in: Array.from(targetSemesterIds) } })
                            }
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
                detectedSeason: detectedSeasonInfo.formatted,
                totalProcessed: rows.length,
                successCount,
                errorCount,
                errors
            }

        } catch (err: any) {
            // Only mark batch as failed if it was created successfully
            if (batch?.Id) {
                await prisma.importBatch.update({
                    where: { Id: batch.Id },
                    data: {
                        Status: 'FAILED',
                        ErrorDetails: err.message
                    }
                }).catch(() => { }) // Silently fail if batch update fails
            }
            throw err
        }
    }
}
