import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as xlsx from 'xlsx'
import crypto from 'crypto'
import { CloudinaryService } from '../../../../shared/infrastructure/services/cloudinary.service.js'
import { detectSeasonFromFilename, SeasonDetectorError, matchesSeason } from '../../../../shared/utils/season-detector.util.js'

import { IEmailService } from '../../../../shared/application/email.service.interface.js'
import { AppError } from '../../../../shared/application/app.error.js'

const prisma = new PrismaClient()

type ImportLecturerRow = Record<string, unknown>

const HEADER_ALIASES: Record<string, string[]> = {
    code: ['mã', 'ma', 'mã giảng viên', 'instructor code', 'lecturer code', 'mssv/gv'],
    fullName: ['họ và tên', 'ho va ten', 'full name', 'fullname', 'tên', 'name'],
    email: ['email', 'gmail'],
    subjects: ['môn dạy', 'mon day', 'subjects'],
    classes: ['lớp dạy', 'lop day', 'classes'],
    avatar: ['avatar', 'ảnh đại diện', 'anh dai dien', 'hình ảnh', 'hinh anh', 'ảnh', 'anh']
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

export class ImportLecturersExcelUseCase {
    constructor(private readonly emailService: IEmailService) { }

    async execute(input: { fileBuffer: Buffer; fileName: string; fileUrl: string; importedByUserId: string }) {
        const { fileBuffer, fileName, fileUrl, importedByUserId } = input

        const normalizedName = fileName.toLowerCase()
        if (!normalizedName.includes('lecturer') && !normalizedName.includes('giảng viên') && !normalizedName.includes('giang_vien') && !normalizedName.includes('gv')) {
            throw new AppError('INVALID_FILE_NAME', 'Tên file không hợp lệ. Vui lòng đặt tên file có chứa từ khoá "lecturer" hoặc "giảng viên" (ví dụ: Lecturer_Spring2026.xlsx)', 400)
        }

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []
        const emailPromises: Promise<any>[] = []

        // 1. SEASON DETECTION
        let detectedSeasonInfo
        try {
            detectedSeasonInfo = detectSeasonFromFilename(fileName)
        } catch (err: any) {
            const errorMsg = err instanceof SeasonDetectorError
                ? err.message
                : 'Không thể xác định mùa học từ tên file'
            throw new AppError('INVALID_SEASON', errorMsg, 400)
        }

        const allSemesters = await prisma.semester.findMany()
        const targetSemesters = allSemesters.filter(
            s => matchesSeason(s.Season, detectedSeasonInfo)
        )

        if (targetSemesters.length === 0) {
            console.log(`[Import] Season '${detectedSeasonInfo.formatted}' not found. Auto-creating season + semesters + subjects...`)
            const { randomUUID } = await import('crypto')
            const seasonLabel = detectedSeasonInfo.formatted

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
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
            const sheetName = workbook.SheetNames[0]
            if (!sheetName) {
                throw new AppError('INVALID_FILE', 'File Excel không có dữ liệu', 400)
            }

            const sheet = workbook.Sheets[sheetName]
            const rows: ImportLecturerRow[] = xlsx.utils.sheet_to_json(sheet)

            await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: { TotalRows: rows.length }
            })

            const lecturerRole = await prisma.role.findUnique({ where: { RoleName: 'LECTURER' } })
            if (!lecturerRole) {
                throw new AppError('SYSTEM_ERROR', 'Chưa cấu hình role LECTURER trong hệ thống', 500)
            }

            // Tracking for sync
            const processedClasses: Array<{ subjectCode: string; classCode: string; userId: string }> = []
            const targetSemesterIds = new Set(targetSemesters.map(s => s.Id))

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]
                const rowIndex = i + 2

                try {
                    const code = getField(row, 'code')
                    const fullName = getField(row, 'fullName')
                    const email = getField(row, 'email')
                    const subjectsStr = getField(row, 'subjects') || ''
                    const classesStr = getField(row, 'classes') || ''
                    const avatarUrlRaw = getField(row, 'avatar') || ''

                    if (!code || !fullName || !email || !subjectsStr || !classesStr) {
                        throw new Error('Thiếu thông tin bắt buộc (Mã GV, Họ và tên, Email, Môn dạy, Lớp dạy)')
                    }

                    // Check duplicate User
                    let user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { Email: email },
                                { StudentCode: code }
                            ]
                        }
                    })

                    let rawPassword = ''
                    let passwordHash = ''

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
                                StudentCode: code,
                                FullName: fullName,
                                Email: email,
                                Avatar: secureAvatarUrl,
                                PasswordHash: passwordHash,
                                Status: 'Active',
                                RequirePasswordChange: true,
                                UserRole: {
                                    create: {
                                        RoleId: lecturerRole.Id,
                                        AssignedAt: new Date()
                                    }
                                }
                            }
                        })
                    } else {
                        // Cập nhật avatar nếu có, và đảm bảo role LECTURER
                        const dataToUpdate: any = {}
                        if (secureAvatarUrl) dataToUpdate.Avatar = secureAvatarUrl
                        if (code && user.StudentCode !== code) dataToUpdate.StudentCode = code

                        if (Object.keys(dataToUpdate).length > 0) {
                            user = await prisma.user.update({
                                where: { Id: user.Id },
                                data: dataToUpdate
                            });
                        }
                        
                        const hasRole = await prisma.userRole.findFirst({
                            where: { UserId: user.Id, RoleId: lecturerRole.Id }
                        })
                        if (!hasRole) {
                            await prisma.userRole.create({
                                data: { UserId: user.Id, RoleId: lecturerRole.Id, AssignedAt: new Date() }
                            })
                        }
                    }

                    // Phân tích theo từng dòng (Alt+Enter) hoặc dấu chấm phẩy (;) để gom nhóm Môn - Lớp
                    const subjectGroups = subjectsStr.split(/\n|;/).map(s => s.trim()).filter(Boolean)
                    const classGroups = classesStr.split(/\n|;/).map(s => s.trim()).filter(Boolean)

                    const classesToAssign: string[] = []
                    const enrolledClassDetails: string[] = []

                    const maxGroups = Math.max(subjectGroups.length, classGroups.length)

                    for (let i = 0; i < maxGroups; i++) {
                        // Lấy group tương ứng, nếu thiếu thì lấy group cuối cùng
                        const sGroup = subjectGroups[i] || subjectGroups[subjectGroups.length - 1] || subjectGroups[0]
                        const cGroup = classGroups[i] || classGroups[classGroups.length - 1] || classGroups[0]

                        if (!sGroup || !cGroup) continue

                        // Tách các môn và lớp trong group hiện tại (bằng dấu phẩy hoặc khoảng trắng)
                        const subjectsInGroup = sGroup.split(/[,]\s*|\s+và\s+|\s+/).map(s => s.trim()).filter(Boolean)
                        const classesInGroup = cGroup.split(/[,]\s*|\s+và\s+|\s+/).map(s => s.trim()).filter(Boolean)

                        for (const subjectCode of subjectsInGroup) {
                            for (const classCode of classesInGroup) {
                                processedClasses.push({ subjectCode, classCode, userId: user.Id })

                        const targetSubj = await prisma.subject.findUnique({
                            where: { SubjectCode: subjectCode }
                        })

                        if (!targetSubj) {
                            console.warn(`[Import Lecturer] Không tìm thấy môn '${subjectCode}' — bỏ qua`)
                            continue
                        }

                        // Lookup class within this season
                        let cls = await prisma.class.findFirst({
                            where: {
                                ClassCode: classCode,
                                SubjectId: targetSubj.Id,
                                SemesterId: { in: Array.from(targetSemesterIds) }
                            },
                            select: { Id: true, SemesterId: true }
                        })

                        if (!cls) {
                            // Find which semester in this season has this subject
                            const semSubj = await (prisma as any).semesterSubject.findFirst({
                                where: {
                                    SubjectId: targetSubj.Id,
                                    SemesterId: { in: Array.from(targetSemesterIds) }
                                }
                            })

                            if (!semSubj) {
                                console.warn(`[Import Lecturer] Không tìm thấy môn '${subjectCode}' trong mùa '${detectedSeasonInfo.formatted}' — bỏ qua`)
                                continue
                            }

                            cls = await prisma.class.create({
                                data: {
                                    ClassCode: classCode,
                                    SubjectId: targetSubj.Id,
                                    SemesterId: semSubj.SemesterId,
                                    Status: 'Active'
                                }
                            })
                            console.log(`[Import Lecturer] Auto-created class '${classCode}' cho môn '${subjectCode}' trong kỳ ${semSubj.SemesterId}`)
                        }

                        classesToAssign.push(cls.Id)
                        const studentCount = await prisma.studentClass.count({ where: { ClassId: cls.Id } })
                        enrolledClassDetails.push(`
                            <tr>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${subjectCode}</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155;">${classCode}</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                                    <span style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 700;">${studentCount}</span>
                                </td>
                            </tr>
                        `)
                            }
                        }
                    }

                    // Assign classes
                    const uniqueClassesToAssign = [...new Set(classesToAssign)]
                    for (const classId of uniqueClassesToAssign) {
                        const existingEnrollment = await prisma.instructorClass.findUnique({
                            where: { UserId_ClassId: { UserId: user.Id, ClassId: classId } }
                        })
                        if (!existingEnrollment) {
                            await prisma.instructorClass.create({
                                data: { UserId: user.Id, ClassId: classId, EnrolledAt: new Date() }
                            })
                        }
                    }

                    // Accumulate emails instead of awaiting them inside the loop
                    if (rawPassword) {
                        const accountEmailHtml = `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                            <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 0.5px;">Chào mừng đến với AITA</h1>
                                <p style="color: #e2e8f0; margin: 8px 0 0 0; font-size: 15px;">Hệ thống Quản lý & Điểm danh Thông minh</p>
                            </div>
                            <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                                <p style="font-size: 16px; margin-top: 0;">Kính gửi Giảng viên <strong style="color: #0f172a;">${fullName}</strong>,</p>
                                <p>Tài khoản của thầy/cô đã được khởi tạo thành công. Dưới đây là thông tin đăng nhập của thầy/cô:</p>
                                
                                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 140px;">Mã Giảng viên:</td>
                                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${code}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Email:</td>
                                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${email}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 12px 0 4px 0; color: #64748b;">Mật khẩu tạm thời:</td>
                                            <td style="padding: 12px 0 4px 0;">
                                                <span style="background: #e0e7ff; color: #4338ca; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${rawPassword}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <p style="background: #fef2f2; color: #b91c1c; padding: 12px 16px; border-radius: 6px; font-size: 14px; border-left: 4px solid #ef4444; margin-bottom: 24px;">
                                    <strong>⚠️ Lưu ý bảo mật:</strong> Vui lòng đổi mật khẩu ngay trong lần đăng nhập đầu tiên để bảo vệ tài khoản của thầy/cô.
                                </p>
                                
                                <p style="margin-bottom: 0;">Trân trọng,<br><strong style="color: #0f172a;">Ban quản trị AITA</strong></p>
                            </div>
                        </div>
                        `
                        emailPromises.push(
                            this.emailService.sendEmail(email, 'Thông tin tài khoản hệ thống AITA (Giảng viên)', accountEmailHtml)
                                .catch(e => console.error(`Failed to send account email to ${email}:`, e))
                        )
                    }

                    const classEnrollmentContent = `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">Phân Công Giảng Dạy</h1>
                                <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 15px;">Mùa học ${detectedSeasonInfo.formatted}</p>
                            </div>
                            <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                                <p style="font-size: 16px; margin-top: 0;">Kính gửi Giảng viên <strong style="color: #0f172a;">${fullName}</strong>,</p>
                                <p>Thầy/cô đã được phân công phụ trách các lớp học trên hệ thống AITA. Dưới đây là danh sách chi tiết các lớp:</p>
                                
                                <div style="border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0; overflow: hidden;">
                                    <table style="width: 100%; border-collapse: collapse; text-align: left; background: #ffffff;">
                                        <thead>
                                            <tr style="background: #f8fafc;">
                                                <th style="padding: 12px 16px; font-size: 14px; color: #475569; border-bottom: 2px solid #e2e8f0;">Môn Học</th>
                                                <th style="padding: 12px 16px; font-size: 14px; color: #475569; border-bottom: 2px solid #e2e8f0;">Lớp Học</th>
                                                <th style="padding: 12px 16px; font-size: 14px; color: #475569; border-bottom: 2px solid #e2e8f0; text-align: center;">Số Sinh Viên</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${enrolledClassDetails.length > 0 ? enrolledClassDetails.join('\n') : '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #64748b; font-style: italic;">Chưa có dữ liệu phân công</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <p>Thầy/cô vui lòng đăng nhập vào hệ thống để kiểm tra danh sách sinh viên, quản lý điểm danh và thiết lập cấu hình môn học.</p>
                                
                                <p style="margin-bottom: 0; margin-top: 30px;">Trân trọng,<br><strong style="color: #0f172a;">Ban quản trị AITA</strong></p>
                            </div>
                        </div>
                    `
                    emailPromises.push(
                        this.emailService.sendEmail(email, 'Phân công giảng dạy hệ thống AITA', classEnrollmentContent)
                            .catch(e => console.error(`Failed to send assignment email to ${email}:`, e))
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

                // Build a map of valid classes the lecturers *should* be in
                for (const pc of processedClasses) {
                    const targetSubj = await prisma.subject.findUnique({
                        where: { SubjectCode: pc.subjectCode }
                    })
                    if (targetSubj) {
                        const cls = await prisma.class.findFirst({
                            where: {
                                ClassCode: pc.classCode,
                                SubjectId: targetSubj.Id,
                                SemesterId: { in: Array.from(targetSemesterIds) }
                            },
                            select: { Id: true }
                        })
                        if (cls) {
                            if (!classRosters.has(cls.Id)) {
                                classRosters.set(cls.Id, new Set())
                            }
                            classRosters.get(cls.Id)!.add(pc.userId)
                        }
                    }
                }

                // Actually, the sync deletion for lecturers should only remove lecturers 
                // who are in this import file from classes in this season that they are no longer assigned to.
                // Wait, if a teacher is entirely missing from the file, should they be removed?
                // The safest is: for every teacher IN THIS FILE, clear their InstructorClass records
                // for classes IN THIS SEASON that they are NOT mapped to in processedClasses.

                const userIdsInFile = [...new Set(processedClasses.map(p => p.userId))]
                
                for (const uId of userIdsInFile) {
                    // Find all classes this user is currently instructing in this season
                    const currentClasses = await prisma.instructorClass.findMany({
                        where: {
                            UserId: uId,
                            Class: {
                                SemesterId: { in: Array.from(targetSemesterIds) }
                            }
                        },
                        include: { Class: true }
                    })

                    // The classes they *should* be instructing according to the file
                    const expectedClassIds = new Set<string>()
                    for (const [classId, validUserIds] of classRosters.entries()) {
                        if (validUserIds.has(uId)) {
                            expectedClassIds.add(classId)
                        }
                    }

                    // Remove them from classes they shouldn't be in
                    for (const cc of currentClasses) {
                        if (!expectedClassIds.has(cc.ClassId)) {
                            await prisma.instructorClass.delete({
                                where: { UserId_ClassId: { UserId: uId, ClassId: cc.ClassId } }
                            })
                            console.log(`[Import Lecturer] Gỡ GV ${uId} khỏi lớp ${cc.Class.ClassCode} (ID: ${cc.ClassId}) do không có trong file mới.`)
                        }
                    }
                }
            } catch (syncErr) {
                console.error('Failed to sync deletions:', syncErr)
            }

            let errorDetailsStr = JSON.stringify(errors)
            if (errorDetailsStr.length > 3900) {
                errorDetailsStr = errorDetailsStr.substring(0, 3900) + '... (truncated)'
            }
            const finalBatch = await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: {
                    Status: 'COMPLETED',
                    SuccessCount: successCount,
                    ErrorCount: errorCount,
                    ErrorDetails: errorDetailsStr
                }
            })

            // Execute all emails in the background without blocking the API response
            // Execute all emails and wait for them so the frontend shows a loading state
            if (emailPromises.length > 0) {
                const results = await Promise.allSettled(emailPromises)
                console.log(`[Import Lecturer] Đã xử lý gửi ${results.length} email thông báo.`);
            }

            return {
                batchId: finalBatch.Id,
                detectedSeason: detectedSeasonInfo.formatted,
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
